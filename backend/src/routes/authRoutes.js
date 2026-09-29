const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const authController = require('../controllers/authController');
const validators = require('../validators/authValidator');

// Slows down password guessing. Configure with AUTH_RATE_LIMIT_MAX.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, validators.register, authController.register);
router.post('/login', authLimiter, validators.login, authController.login);

module.exports = router;
