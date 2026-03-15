const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const prisma = require('../config/db');

const authenticate = passport.authenticate('jwt', { session: false });

// Get sensors (Filtered by Company)
router.get('/', authenticate, async (req, res) => {
    const where = req.user.role === 'SYSTEM_ADMIN' ? {} : { companyId: req.user.companyId };

    const sensors = await prisma.sensor.findMany({
        where,
        include: {
            readings: {
                take: 1,
                orderBy: { timestamp: 'desc' }
            }
        }
    });
    res.json(sensors);
});

// Get single sensor detail
router.get('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const sensor = await prisma.sensor.findFirst({
        where: {
            id,
            ...(req.user.role === 'SYSTEM_ADMIN' ? {} : { companyId: req.user.companyId })
        },
        include: {
            company: { select: { name: true } },
            readings: { take: 1, orderBy: { timestamp: 'desc' } }
        }
    });
    if (!sensor) return res.status(404).json({ message: 'Sensor not found' });
    res.json(sensor);
});

// Get readings for a specific sensor (Filtered by Company)
router.get('/:id/readings', authenticate, async (req, res) => {
    const { id } = req.params;
    const { limit = 100, from, to } = req.query;

    // Check if user has access to this sensor
    const sensor = await prisma.sensor.findFirst({
        where: {
            id,
            ...(req.user.role === 'SYSTEM_ADMIN' ? {} : { companyId: req.user.companyId })
        }
    });

    if (!sensor) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this sensor' });
    }

    const where = { sensorId: id };
    if (from || to) {
        where.timestamp = {};
        if (from) where.timestamp.gte = new Date(from);
        if (to) where.timestamp.lte = new Date(to);
    }

    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = Math.min(parseInt(limit) || 100, 500);
    const skip = (page - 1) * itemsPerPage;

    const [readings, total] = await Promise.all([
        prisma.sensorReading.findMany({
            where,
            orderBy: { timestamp: 'asc' },
            take: itemsPerPage,
            skip
        }),
        prisma.sensorReading.count({ where })
    ]);

    res.json({
        data: readings,
        pagination: {
            total,
            page,
            limit: itemsPerPage,
            totalPages: Math.ceil(total / itemsPerPage)
        }
    });
});

const { publish } = require('../services/mqttService');
const logger = require('../config/logger');

// Send remote command to a specific sensor via MQTT Publish
router.post('/:id/command', authenticate, async (req, res) => {
    const { id } = req.params;
    const { action, payload } = req.body;

    if (!action) {
        return res.status(400).json({ message: 'Action is required to send a command' });
    }

    // Security: Check if user has access to this sensor before sending command
    const sensor = await prisma.sensor.findFirst({
        where: {
            id,
            ...(req.user.role === 'SYSTEM_ADMIN' ? {} : { companyId: req.user.companyId })
        }
    });

    if (!sensor) {
        logger.warn('Unauthorized MQTT Command Attempt', { userId: req.user.id, sensorId: id, action });
        return res.status(403).json({ message: 'Forbidden: You do not have access to command this sensor' });
    }

    const topic = `sensors/${sensor.sensorExternalId}/command`;
    const message = {
        action,
        payload: payload || {},
        timestamp: Math.floor(Date.now() / 1000),
        sender: req.user.email
    };

    try {
        publish(topic, message);
        logger.info('MQTT Command Published', { topic, action, userId: req.user.id });
        res.json({ message: 'Command queued successfully', topic, action });
    } catch (err) {
        logger.error('Failed to publish MQTT command', { error: err.message, topic });
        res.status(500).json({ message: 'Internal server error while dispatching command' });
    }
});

module.exports = router;
