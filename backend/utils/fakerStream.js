const { faker } = require('@faker-js/faker');
const { publish } = require('../src/services/mqttService');
const prisma = require('../src/config/db');
const { applyOverride, getOverride } = require('./sensorOverrides');

const FULL_KEY = '__full__';

/**
 * Faker'ın sahip olduğu jeneratörler.
 * Sadece bu listede olan alanlar faker tarafından güncellenir.
 */
/**
 * Faker'ın sahip olduğu jeneratörler.
 * Anahtar kelime tabanlı tarama yapar.
 */
const FAKER_GENERATORS = {
    temperature: () => faker.number.float({ min: 18, max: 28, fractionDigits: 1 }),
    temp: () => faker.number.float({ min: 18, max: 28, fractionDigits: 1 }),
    humidity: () => faker.number.float({ min: 30, max: 60, fractionDigits: 1 }),
    hum: () => faker.number.float({ min: 30, max: 60, fractionDigits: 1 }),
    battery: () => faker.number.int({ min: 10, max: 100 }),
    status: () => faker.helpers.arrayElement(['online', 'online', 'warning']),
    co2: () => faker.number.int({ min: 400, max: 1200 }),
    pm25: () => faker.number.float({ min: 5, max: 50, fractionDigits: 1 }),
    pm10: () => faker.number.float({ min: 10, max: 80, fractionDigits: 1 }),
    voc_index: () => faker.number.int({ min: 50, max: 150 }),
    power_w: () => faker.number.float({ min: 500, max: 3000, fractionDigits: 1 }),
};

/** Objedeki bilinen her anahtarı jeneratörle tazeler */
const updateNestedValues = (obj, exclude = []) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key in obj) {
        if (exclude.includes(key)) continue; // İstisnaları atla
        if (key in FAKER_GENERATORS) {
            obj[key] = FAKER_GENERATORS[key]();
        } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            updateNestedValues(obj[key], exclude);
        }
    }
    return obj;
};

const startFakeSensorDataStream = () => {
    console.log('[FakerStream] Initialized — recursive schema mode (deep update)');

    setInterval(async () => {
        try {
            const sensors = await prisma.sensor.findMany();
            if (sensors.length === 0) return;

            for (const sensor of sensors) {
                const externalId = sensor.sensorExternalId;
                const topic = `sensors/${externalId}/data`;

                // DB'den veya Override'dan son halini al
                const lastReading = await prisma.sensorReading.findFirst({
                    where: { sensorId: sensor.id },
                    orderBy: { timestamp: 'desc' }
                });

                // basePayload = template gibi davranacak (DB'den taze)
                let basePayload = lastReading?.data || {
                    temperature: 22,
                    humidity: 50,
                    status: 'online'
                };

                // ── 1. Önce Bilinen Değerleri Canlı Tut (Recursive) ──────
                const ov = getOverride(externalId);
                const isFullFakerEnabled = ov && ov[FULL_KEY] && ov[FULL_KEY].faker === true;

                let freshPayload;
                if (isFullFakerEnabled) {
                    // "Canlı Şema" Modu: Kullanıcının JSON'unu baz al ama status hariç her şeyi güncelle
                    const schemaCopy = JSON.parse(JSON.stringify(ov[FULL_KEY]));
                    freshPayload = updateNestedValues(schemaCopy, ['status', 'faker']);
                } else {
                    // Standart Mod: DB'deki son veriyi baz al ve güncelle
                    freshPayload = updateNestedValues(JSON.parse(JSON.stringify(basePayload)));
                }

                freshPayload.sensor_id = externalId;
                freshPayload.timestamp = Math.floor(Date.now() / 1000);

                // ── 2. Override Uygula (Canlı şema değilse manuel override'lar üstündür) ──
                const finalPayload = isFullFakerEnabled ? freshPayload : applyOverride(externalId, freshPayload);

                publish(topic, finalPayload);
            }
        } catch (error) {
            console.error('[FakerStream] Loop error:', error.message);
        }
    }, 5000);
};

module.exports = { startFakeSensorDataStream };
