const router = require('express').Router();
const controller = require('../controllers/vehicleController');
const validators = require('../validators/vehicleValidator');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Customers manage their own vehicles.
router.use(authenticate, authorize('CUSTOMER'));

router.get('/', controller.listVehicles);
router.post('/', validators.vehicle, controller.createVehicle);
router.get('/:id', controller.getVehicle);
router.put('/:id', validators.vehicle, controller.updateVehicle);
router.delete('/:id', controller.deleteVehicle);

module.exports = router;
