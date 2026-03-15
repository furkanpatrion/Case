const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const logger = require('../config/logger');

const register = async (req, res) => {
    const { email, password, role, companyId } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: role || 'USER',
                companyId
            }
        });

        logger.info('User Registered', { userId: user.id, email: user.email, role: user.role });

        // Intentional manual log for register as it's often public
        await prisma.userActivity.create({
            data: { userId: user.id, action: 'REGISTERED', details: { ip: req.ip } }
        });

        res.status(201).json({ message: 'User created', userId: user.id });
    } catch (err) {
        logger.error('Registration Failed', { error: err.message, email });
        res.status(400).json({ message: 'Error creating user', error: err.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1d' }
    );

    logger.info('User Logged In', { userId: user.id, email: user.email });

    // Intentional manual log for login
    await prisma.userActivity.create({
        data: { userId: user.id, action: 'LOGGED_IN', details: { ip: req.ip, agent: req.get('User-Agent') } }
    });

    res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            company: user.company
        }
    });
};

const getProfile = async (req, res) => {
    res.json(req.user);
};

module.exports = { register, login, getProfile };
