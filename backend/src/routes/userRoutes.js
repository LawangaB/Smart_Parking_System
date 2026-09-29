const router = require('express').Router();
const controller = require('../controllers/userController');
const validators = require('../validators/userValidator');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/me', authenticate, controller.getMe);
router.put('/me', authenticate, validators.updateProfile, controller.updateMe);

// Administrator only
router.get('/', authenticate, authorize('ADMIN'), controller.listUsers);
router.patch('/:id/status', authenticate, authorize('ADMIN'), validators.updateStatus, controller.updateUserStatus);

module.exports = router;
