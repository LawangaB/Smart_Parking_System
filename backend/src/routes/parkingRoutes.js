/**
 * Parking locations, slots and availability.
 * This router is mounted at /api, so authentication is applied per route
 * (a router-level middleware would also run for unrelated /api paths).
 */
const router = require('express').Router();
const controller = require('../controllers/parkingController');
const validators = require('../validators/parkingValidator');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const admin = [authenticate, authorize('ADMIN')];

// Locations: browsing is public (active locations only), changes are administrator-only.
router.get('/locations', optionalAuthenticate, validators.optionalWindowQuery, controller.listLocations);
router.get('/locations/:id', optionalAuthenticate, controller.getLocation);
router.post('/locations', ...admin, validators.location, controller.createLocation);
router.put('/locations/:id', ...admin, validators.location, controller.updateLocation);
router.delete('/locations/:id', ...admin, controller.deleteLocation);

// Fee estimate for a booking
router.get('/locations/:id/quote', authenticate, validators.quoteQuery, controller.getQuote);

// Slots
router.get('/locations/:locationId/slots', authenticate, validators.optionalWindowQuery, controller.listSlots);
router.post('/locations/:locationId/slots', ...admin, validators.slot, controller.createSlot);
router.post('/locations/:locationId/slots/bulk', ...admin, validators.bulkSlots, controller.createSlotsBulk);
router.put('/slots/:id', ...admin, validators.slot, controller.updateSlot);
router.patch('/slots/:id/status', ...admin, validators.slotStatus, controller.updateSlotStatus);
router.delete('/slots/:id', ...admin, controller.deleteSlot);

// Availability for a time window
router.get('/availability', authenticate, validators.availabilityQuery, controller.getAvailability);

module.exports = router;
