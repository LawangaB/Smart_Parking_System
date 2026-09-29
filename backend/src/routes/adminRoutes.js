const router = require('express').Router();
const controller = require('../controllers/adminController');
const reservationValidators = require('../validators/reservationValidator');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', controller.getDashboard);
router.get('/reservations', reservationValidators.listQuery, controller.listReservations);
router.patch('/reservations/:id/status', reservationValidators.adminStatus, controller.updateReservationStatus);

module.exports = router;
