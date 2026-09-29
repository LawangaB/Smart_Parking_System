export const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'VAN', 'TRUCK'];

export const VEHICLE_TYPE_LABELS = {
  CAR: 'Car',
  MOTORCYCLE: 'Motorcycle',
  VAN: 'Van',
  TRUCK: 'Truck',
};

export const RESERVATION_STATUSES = ['RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export const RESERVATION_STATUS_LABELS = {
  RESERVED: 'Reserved',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const SLOT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE'];
export const LOCATION_STATUSES = ['ACTIVE', 'INACTIVE'];
export const FEE_STATUSES = ['ACTIVE', 'INACTIVE'];

export const SLOT_STATUS_LABELS = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
};

/** Admin-allowed reservation changes; mirrors RESERVATION_TRANSITIONS in the backend. */
export const RESERVATION_TRANSITIONS = {
  RESERVED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Booking limits; mirrors RESERVATION_RULES in the backend (the server stays authoritative). */
export const RESERVATION_RULES = {
  MAX_DURATION_HOURS: 24 * 30,
  MAX_ADVANCE_DAYS: 90,
  START_GRACE_MINUTES: 5,
};
