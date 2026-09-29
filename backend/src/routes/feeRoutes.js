const router = require('express').Router();
const controller = require('../controllers/feeController');
const validators = require('../validators/feeValidator');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/', controller.listFees);
router.post('/', validators.fee, controller.createFee);
router.put('/:id', validators.fee, controller.updateFee);
router.delete('/:id', controller.deleteFee);

module.exports = router;
