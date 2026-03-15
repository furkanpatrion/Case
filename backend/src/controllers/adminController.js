const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

// System Admin: Manage Companies
const getAllCompanies = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    let where = {};
    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }

    const [companies, total] = await Promise.all([
        prisma.company.findMany({
            where,
            include: { _count: { select: { users: true, sensors: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.company.count({ where })
    ]);

    res.json({
        data: companies,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
};

const createCompany = async (req, res) => {
    const { name } = req.body;
    const company = await prisma.company.create({ data: { name } });
    res.status(201).json(company);
};

// System Admin & Company Admin: Manage Users
const getUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    let where = {};
    if (req.user.role === 'SYSTEM_ADMIN') {
        where = {}; // Sees everyone
    } else {
        where = {
            companyId: req.user.companyId,
            role: { not: 'SYSTEM_ADMIN' }
        };
    }

    if (search) {
        where.AND = [
            where,
            { email: { contains: search, mode: 'insensitive' } }
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: { id: true, email: true, role: true, company: true, createdAt: true },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
    ]);

    res.json({
        data: users,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
};

const createUser = async (req, res) => {
    const { email, password, role, companyId } = req.body;

    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Security
    const finalCompanyId = req.user.role === 'SYSTEM_ADMIN' ? companyId : req.user.companyId;
    const finalRole = req.user.role === 'SYSTEM_ADMIN' ? role : 'USER';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            role: finalRole,
            companyId: finalCompanyId
        }
    });

    res.status(201).json({ id: user.id, email: user.email });
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, companyId, email } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Security: Company Admin can only update users in their company
    if (req.user.role !== 'SYSTEM_ADMIN' && targetUser.companyId !== req.user.companyId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const data = {};
    if (email) data.email = email;
    if (req.user.role === 'SYSTEM_ADMIN') {
        if (role) data.role = role;
        if (companyId) data.companyId = companyId;
    } else {
        // Company Admin might promote/demote within their company but typically they manage USER/COMPANY_ADMIN
        if (role && role !== 'SYSTEM_ADMIN') data.role = role;
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id },
            data
        });

        res.json(updatedUser);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        logger.error('User Update Failed', { error: err.message, userId: id });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.role !== 'SYSTEM_ADMIN' && targetUser.companyId !== req.user.companyId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
};

// Manage Sensors
const createSensor = async (req, res) => {
    const { sensorExternalId, name, type, group, companyId, metadata } = req.body;

    // Security
    let finalCompanyId = companyId;
    if (req.user.role !== 'SYSTEM_ADMIN') {
        finalCompanyId = req.user.companyId;
    }

    if (!finalCompanyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const sensor = await prisma.sensor.create({
            data: {
                sensorExternalId,
                name,
                type,
                group,
                companyId: finalCompanyId,
                metadata: metadata || {}
            }
        });
        res.status(201).json(sensor);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'A sensor with this ID already exists', error: err.message });
        }
        throw err;
    }
};

// Activity Logs
const getActivityLogs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const action = req.query.action;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    let where = req.user.role === 'SYSTEM_ADMIN' ? {} : { user: { companyId: req.user.companyId } };

    if (action) {
        where.action = action;
    }

    if (search) {
        where.OR = [
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { action: { contains: search, mode: 'insensitive' } }
        ];
    }

    const [logs, total] = await Promise.all([
        prisma.userActivity.findMany({
            where,
            include: { user: { select: { email: true, company: true } } },
            orderBy: { timestamp: 'desc' },
            skip,
            take: limit
        }),
        prisma.userActivity.count({ where })
    ]);

    res.json({
        data: logs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
};

const getActivityStats = async (req, res) => {
    const where = req.user.role === 'SYSTEM_ADMIN' ? {} : { user: { companyId: req.user.companyId } };
    const now = new Date();

    const logs = await prisma.userActivity.findMany({
        where: {
            ...where,
            timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        },
        select: { timestamp: true }
    });

    // Group by hour in chronological order (last 24 slots)
    const stats = [];
    for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime());
        d.setHours(d.getHours() - i, 0, 0, 0);

        const start = d.getTime();
        const end = start + 60 * 60 * 1000;

        const count = logs.filter(log => {
            const ts = new Date(log.timestamp).getTime();
            return ts >= start && ts < end;
        }).length;

        stats.push({
            label: `${d.getHours()}:00`,
            count
        });
    }

    res.json(stats);
};

const updateGroupSensors = async (req, res) => {
    const { oldName, newName } = req.body;

    let where = { group: oldName };
    if (req.user.role !== 'SYSTEM_ADMIN') {
        where.companyId = req.user.companyId;
    }

    try {
        await prisma.sensor.updateMany({
            where,
            data: { group: newName }
        });
        logger.info('Group Sensors Updated', { oldName, newName, userId: req.user.id });
        res.json({ message: 'Group renamed successfully' });
    } catch (err) {
        logger.error('Group Update Failed', { error: err.message, oldName });
        res.status(500).json({ message: 'Failed to update group nodes' });
    }
};

module.exports = { getAllCompanies, createCompany, getUsers, createUser, updateUser, deleteUser, createSensor, updateGroupSensors, getActivityLogs, getActivityStats };
