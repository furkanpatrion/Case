const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { authorize } = require('../middleware/authMiddleware');
const { logActivity } = require('../middleware/activityLogger');
const { getAllCompanies, createCompany, getUsers, createUser, updateUser, deleteUser, createSensor, updateGroupSensors, getActivityLogs, getActivityStats, getAnalytics } = require('../controllers/adminController');

const { registerValidation, sensorValidation } = require('../middleware/validator');
const authenticate = passport.authenticate('jwt', { session: false });
const syscompperm = ["SYSTEM_ADMIN", "COMPANY_ADMIN"]
const sysperm = ["SYSTEM_ADMIN"]

// System Admin Only
router.get('/companies', authenticate, authorize(...sysperm), getAllCompanies);
router.post('/companies', authenticate, authorize(...sysperm), logActivity('create_company'), createCompany);

// System Admin & Company Admin
router.get('/users', authenticate, authorize(...syscompperm), getUsers);
router.post('/users', authenticate, authorize(...syscompperm), registerValidation, logActivity('create_user'), createUser);
router.patch('/users/:id', authenticate, authorize(...syscompperm), logActivity('update_user'), updateUser);
router.delete('/users/:id', authenticate, authorize(...syscompperm), logActivity('delete_user'), deleteUser);
router.post('/sensors', authenticate, authorize(...syscompperm), sensorValidation, logActivity('create_sensor'), createSensor);
router.patch('/sensors/groups', authenticate, authorize(...syscompperm), logActivity('rename_group'), updateGroupSensors);

// Activity Logs with Behavior Tracking
router.get('/logs', authenticate, authorize(...syscompperm), logActivity('viewed_logs'), getActivityLogs);
router.get('/stats/activity', authenticate, authorize(...syscompperm), getActivityStats);
router.get('/stats/behavior-analytics', authenticate, authorize(...syscompperm), getAnalytics);


module.exports = router;
