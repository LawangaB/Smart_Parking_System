const { validate, integer, dateTime, choice, isMissing } = require('./helpers');
const { RESERVATION_STATUSES } = require('../utils/constants');

const create = validate(({ body }, add) => {
  integer(add, 'vehicleId', body.vehicleId, { label: 'Vehicle' });
  integer(add, 'slotId', body.slotId, { label: 'Parking slot' });
  dateTime(add, 'startTime', body.startTime, { label: 'Start time' });
  dateTime(add, 'endTime', body.endTime, { label: 'End time' });
});

const adminStatus = validate(({ body }, add) => {
  choice(add, 'status', body.status, RESERVATION_STATUSES, { label: 'Status' });
});

/** ?status=RESERVED,ACTIVE (comma separated) */
const listQuery = validate(({ query }, add) => {
  if (!isMissing(query.status)) {
    const invalid = String(query.status)
      .split(',')
      .map((value) => value.trim())
      .filter((value) => !RESERVATION_STATUSES.includes(value));
    if (invalid.length) add('status', `Status must be one of: ${RESERVATION_STATUSES.join(', ')}.`);
  }
  if (!isMissing(query.locationId)) integer(add, 'locationId', query.locationId, { label: 'Location ID' });
  if (!isMissing(query.order) && !['asc', 'desc'].includes(String(query.order).toLowerCase())) {
    add('order', 'Order must be asc or desc.');
  }
});

module.exports = { create, adminStatus, listQuery };
