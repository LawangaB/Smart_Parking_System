const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/vehicles', require('./vehicleRoutes'));
router.use('/reservations', require('./reservationRoutes'));
router.use('/fees', require('./feeRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/', require('./parkingRoutes')); // /locations, /slots, /availability

module.exports = router;
