const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { register, login, getProfile } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validator');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', passport.authenticate('jwt', { session: false }), getProfile);

module.exports = router;
