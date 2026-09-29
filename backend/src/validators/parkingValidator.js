const { validate, text, phone, choice, integer, dateTime, isMissing } = require('./helpers');
const { LOCATION_STATUSES, SLOT_STATUSES, VEHICLE_TYPES } = require('../utils/constants');

const location = validate(({ body }, add) => {
  text(add, 'name', body.name, { label: 'Name', max: 150 });
  text(add, 'address', body.address, { label: 'Address', max: 255 });
  text(add, 'description', body.description, { label: 'Description', required: false, max: 2000 });
  text(add, 'operatingHours', body.operatingHours, { label: 'Operating hours', required: false, max: 100 });
  phone(add, 'contactNumber', body.contactNumber);
  choice(add, 'status', body.status, LOCATION_STATUSES, { label: 'Status', required: false });
});

const slot = validate(({ body }, add) => {
  text(add, 'slotNumber', body.slotNumber, { label: 'Slot number', max: 20 });
  choice(add, 'slotType', body.slotType, VEHICLE_TYPES, { label: 'Slot type' });
  choice(add, 'status', body.status, SLOT_STATUSES, { label: 'Status', required: false });
});

const bulkSlots = validate(({ body }, add) => {
  text(add, 'prefix', body.prefix, { label: 'Prefix', required: false, max: 10 });
  if (typeof body.prefix === 'string' && body.prefix && !/^[A-Za-z0-9-]+$/.test(body.prefix)) {
    add('prefix', 'Prefix may only contain letters, numbers and hyphens.');
  }
  integer(add, 'startNumber', body.startNumber, { label: 'Start number', required: false, min: 1, max: 9999 });
  integer(add, 'count', body.count, { label: 'Count', min: 1, max: 200 });
  choice(add, 'slotType', body.slotType, VEHICLE_TYPES, { label: 'Slot type' });
});

const slotStatus = validate(({ body }, add) => {
  choice(add, 'status', body.status, SLOT_STATUSES, { label: 'Status' });
});

const availabilityQuery = validate(({ query }, add) => {
  integer(add, 'locationId', query.locationId, { label: 'Location ID' });
  dateTime(add, 'startTime', query.startTime, { label: 'Start time' });
  dateTime(add, 'endTime', query.endTime, { label: 'End time' });
  choice(add, 'vehicleType', query.vehicleType, VEHICLE_TYPES, { label: 'Vehicle type', required: false });
});

const quoteQuery = validate(({ query }, add) => {
  choice(add, 'vehicleType', query.vehicleType, VEHICLE_TYPES, { label: 'Vehicle type' });
  dateTime(add, 'startTime', query.startTime, { label: 'Start time' });
  dateTime(add, 'endTime', query.endTime, { label: 'End time' });
});

/** Optional window/vehicle filters used by the location and slot list endpoints. */
const optionalWindowQuery = validate(({ query }, add) => {
  const hasStart = !isMissing(query.startTime);
  const hasEnd = !isMissing(query.endTime);
  if (hasStart || hasEnd) {
    dateTime(add, 'startTime', query.startTime, { label: 'Start time' });
    dateTime(add, 'endTime', query.endTime, { label: 'End time' });
  }
  choice(add, 'vehicleType', query.vehicleType, VEHICLE_TYPES, { label: 'Vehicle type', required: false });
});

module.exports = { location, slot, bulkSlots, slotStatus, availabilityQuery, quoteQuery, optionalWindowQuery };
