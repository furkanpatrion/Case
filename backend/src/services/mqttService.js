const mqtt = require('mqtt');
const prisma = require('../config/db');
const logger = require('../config/logger');
const fs = require('fs');
const {
    clearOverride,
    setFieldOverride,
    clearFieldOverride,
    setFullOverride,
    applyOverride,
    parseCommandAction,
} = require('../../utils/sensorOverrides');

const MQTT_URL = process.env.MQTT_URL;

const mqttOptions = {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
};

if (MQTT_URL && MQTT_URL.startsWith('mqtts')) {
    try {
        mqttOptions.ca = [fs.readFileSync('/app/certs/ca.crt')];
        mqttOptions.rejectUnauthorized = false;
    } catch (e) {
        logger.error('Failed to load MQTT client certificates.', { error: e.message });
    }
}

const client = mqtt.connect(MQTT_URL, mqttOptions);
let ioServer = null;

const initSocketIO = (io) => { ioServer = io; };

// Publisher
const publish = (topic, payload) => {
    if (client.connected) {
        client.publish(topic, JSON.stringify(payload));
        logger.info(`Published to [${topic}]`);
    } else {
        logger.warn(`Failed to publish to [${topic}] - Client offline`);
    }
};

const initMQTT = () => {
    client.on('connect', () => {
        logger.info('Connected to Secure MQTT Broker');

        client.subscribe('sensors/+/data', (err) => {
            if (!err) logger.info('Subscribed to sensors/+/data (Topic wildcard)');
        });

        client.subscribe('sensors/+/command', (err) => {
            if (!err) logger.info('Subscribed to sensors/+/command (Command listener)');
        });
    });

    client.on('message', async (topic, message) => {
        try {
            if (message.length > 10000) {
                logger.warn('Received oversized MQTT payload. Ignoring.', { topic });
                return;
            }

            // Command topic mu?
            const commandMatch = topic.match(/^sensors\/(.+)\/command$/);
            if (commandMatch) {
                await handleCommand(commandMatch[1], message);
                return;
            }

            // Data topic
            const rawBody = message.toString();
            let payload;
            try {
                payload = JSON.parse(rawBody);
            } catch (jsonErr) {
                logger.error('Invalid JSON received via MQTT', { rawBody, topic });
                return;
            }

            if (!payload.sensor_id) {
                logger.error('Invalid Data Format. Missing sensor_id.', { payload });
                return;
            }

            const sensor = await prisma.sensor.findUnique({
                where: { sensorExternalId: payload.sensor_id }
            });

            if (!sensor) {
                logger.warn(`Sensor ${payload.sensor_id} not found in database.`, { payload });
                return;
            }

            const readingData = await prisma.sensorReading.create({
                data: {
                    sensorId: sensor.id,
                    data: payload,
                    timestamp: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date()
                }
            });

            if (ioServer) {
                ioServer.emit('sensor_data', {
                    nodeId: sensor.id,
                    externalId: payload.sensor_id,
                    timestamp: readingData.timestamp,
                    payload
                });
            }

        } catch (error) {
            logger.error('MQTT Message Processing Error:', { error: error.message, stack: error.stack });
        }
    });
};

// ─── Komut İşleyici ──────────────────────────────────────────────────────────
//
// Komut Sözdizimi (action alanı):
//   {}                     → Tüm override'ları sil, faker kontrolüne bırak
//   {"key":"val", ...}     → Tüm payload'ı kilitle (faker hiçbir alana dokunamaz)
//   key:value              → Sadece o alanı kilitle (faker diğerlerini günceler)
//   key                    → O alanın kilidini aç, faker'a bırak
//
// Tip otomatik tespiti (key:value):
//   true/false → boolean  |  42 / 3.14 → number  |  diğerleri → string
//
const handleCommand = async (externalId, message) => {
    let cmd;
    try {
        cmd = JSON.parse(message.toString());
    } catch {
        logger.error('Invalid JSON in command payload', { externalId });
        return;
    }

    const { action } = cmd;
    const parsed = parseCommandAction(action);

    logger.info(`Command [${externalId}]: type=${parsed.type}`, { action, parsed });

    // Sensörü bul
    const sensor = await prisma.sensor.findUnique({
        where: { sensorExternalId: externalId }
    });
    if (!sensor) {
        logger.warn(`Command target [${externalId}] not found in DB`);
        return;
    }

    // Override uygula
    switch (parsed.type) {
        case 'clear_all':
            clearOverride(externalId);
            logger.info(`Override cleared for [${externalId}] → faker controls all fields`);
            break;

        case 'full_json':
            setFullOverride(externalId, { ...parsed.value, sensor_id: externalId });
            logger.info(`Full override set for [${externalId}]`, { payload: parsed.value });
            break;

        case 'field_set':
            setFieldOverride(externalId, parsed.key, parsed.value);
            logger.info(`Field override set for [${externalId}]: ${parsed.key} = ${JSON.stringify(parsed.value)}`);
            break;

        case 'field_clear':
            clearFieldOverride(externalId, parsed.key);
            logger.info(`Field override cleared for [${externalId}]: ${parsed.key} → faker controls`);
            break;

        default:
            logger.warn(`Unknown command format for [${externalId}]`, { action });
            return;
    }

    // Override sonucunu anında Socket.IO ile frontende gönder
    // (Faker'ın 5 saniye beklemesine gerek yok)
    await emitOverrideImmediate(sensor, externalId);
};

// ─── Anlık Güncelleme Yayını + DB Kaydı ─────────────────────────────────────
// Override set edildikten sonra:
//   1. DB'ye kaydet   → sayfa refresh edilse bile doğru veri görünür
//   2. Socket.IO emit → kullanıcı 5 saniye beklemez, anında güncellenir
const emitOverrideImmediate = async (sensor, externalId) => {
    try {
        const lastReading = await prisma.sensorReading.findFirst({
            where: { sensorId: sensor.id },
            orderBy: { timestamp: 'desc' }
        });

        const basePayload = lastReading?.data || {
            sensor_id: externalId,
            timestamp: Math.floor(Date.now() / 1000)
        };

        const mergedPayload = applyOverride(externalId, {
            ...basePayload,
            timestamp: Math.floor(Date.now() / 1000)
        });

        // ── 1. DB'ye kaydet ──────────────────────────────────────────────────
        // Override değerleri DB'de kalıcı hale gelir.
        // Sayfa yenilendiğinde REST API (GET /api/sensors) bu veriyi döner.
        const savedReading = await prisma.sensorReading.create({
            data: {
                sensorId: sensor.id,
                data: mergedPayload,
                timestamp: new Date()
            }
        });

        // ── 2. Socket.IO emit ────────────────────────────────────────────────
        if (ioServer) {
            ioServer.emit('sensor_data', {
                nodeId: sensor.id,
                externalId,
                timestamp: savedReading.timestamp,
                payload: mergedPayload
            });
        }

        logger.info(`Override saved to DB and emitted for [${externalId}]`);
    } catch (err) {
        logger.error('emitOverrideImmediate error', { error: err.message });
    }
};

module.exports = { initMQTT, client, publish, initSocketIO };
