const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { authorize } = require('../middleware/authMiddleware');
const { logActivity } = require('../middleware/activityLogger');
const { getAllCompanies, createCompany, getUsers, createUser, updateUser, deleteUser, createSensor, updateGroupSensors, getActivityLogs, getActivityStats } = require('../controllers/adminController');

const { registerValidation, sensorValidation } = require('../middleware/validator');
const authenticate = passport.authenticate('jwt', { session: false });
const syscompperm = ["SYSTEM_ADMIN", "COMPANY_ADMIN"]
const sysperm = ["SYSTEM_ADMIN"]

// System Admin Only
router.get('/companies', authenticate, authorize(...sysperm), getAllCompanies);
router.post('/companies', authenticate, authorize(...sysperm), createCompany);

// System Admin & Company Admin
router.get('/users', authenticate, authorize(...syscompperm), getUsers);
router.post('/users', authenticate, authorize(...syscompperm), registerValidation, createUser);
router.patch('/users/:id', authenticate, authorize(...syscompperm), updateUser);
router.delete('/users/:id', authenticate, authorize(...syscompperm), deleteUser);
router.post('/sensors', authenticate, authorize(...syscompperm), sensorValidation, createSensor);
router.patch('/sensors/groups', authenticate, authorize(...syscompperm), updateGroupSensors);

// Activity Logs with Behavior Tracking
router.get('/logs', authenticate, authorize(...syscompperm), logActivity('viewed_logs'), getActivityLogs);
router.get('/stats/activity', authenticate, authorize(...syscompperm), getActivityStats);

module.exports = router;
