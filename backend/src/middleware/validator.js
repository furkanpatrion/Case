const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return res.status(400).json({ errors: errors.array() });
};

const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['USER', 'COMPANY_ADMIN', 'SYSTEM_ADMIN']),
    body('companyId').optional().isUUID(),
    validate
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate
];

const sensorValidation = [
    body('sensorExternalId').notEmpty().trim().escape(),
    body('name').optional().trim().escape(),
    body('type').optional().trim().escape(),
    body('group').optional().trim().escape(),
    body('companyId').optional().isUUID(),
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    sensorValidation
};
