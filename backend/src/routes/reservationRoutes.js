const router = require('express').Router();
const controller = require('../controllers/reservationController');
const validators = require('../validators/reservationValidator');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Customers reserve slots and see their own bookings.
router.use(authenticate, authorize('CUSTOMER'));

router.post('/', validators.create, controller.create);
router.get('/', validators.listQuery, controller.listMine);
router.get('/summary', controller.summary); // must be declared before '/:id'
router.get('/:id', controller.getOne);
router.patch('/:id/cancel', controller.cancel);

module.exports = router;
