const prisma = require('../config/db');
const logger = require('../config/logger');

const logActivity = (action) => {
    return async (req, res, next) => {
        if (req.user) {
            const logData = {
                userId: req.user.id,
                email: req.user.email,
                companyId: req.user.companyId,
                action: action,
                method: req.method,
                path: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            };

            // Log to Winston (and Seq if configured)
            logger.info(`User Activity: ${action}`, logData);

            try {
                // Persistent DB Logging as per requirements
                await prisma.userActivity.create({
                    data: {
                        userId: req.user.id,
                        action: action,
                        details: logData
                    }
                });
            } catch (err) {
                logger.error('Activity Persistence Error:', { error: err.message, userId: req.user.id });
            }
        }
        next();
    };
};

module.exports = { logActivity };
