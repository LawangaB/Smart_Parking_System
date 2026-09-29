const ROLES = Object.freeze({ CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' });

const USER_STATUSES = ['ACTIVE', 'INACTIVE'];
const LOCATION_STATUSES = ['ACTIVE', 'INACTIVE'];
const FEE_STATUSES = ['ACTIVE', 'INACTIVE'];
const SLOT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'VAN', 'TRUCK'];
const RESERVATION_STATUSES = ['RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

/** Reservations in these statuses hold their slot (they count in conflict checks). */
const BLOCKING_RESERVATION_STATUSES = ['RESERVED', 'ACTIVE'];

/** Allowed manual status changes made by an administrator. */
const RESERVATION_TRANSITIONS = Object.freeze({
  RESERVED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
});

const RESERVATION_RULES = Object.freeze({
  MAX_DURATION_HOURS: 24 * 30, // 30 days
  MAX_ADVANCE_DAYS: 90,
  START_GRACE_MINUTES: 5, // allow "now" bookings that were submitted a moment late
});

module.exports = {
  ROLES,
  USER_STATUSES,
  LOCATION_STATUSES,
  FEE_STATUSES,
  SLOT_STATUSES,
  VEHICLE_TYPES,
  RESERVATION_STATUSES,
  BLOCKING_RESERVATION_STATUSES,
  RESERVATION_TRANSITIONS,
  RESERVATION_RULES,
};
