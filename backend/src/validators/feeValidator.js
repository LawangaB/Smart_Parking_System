const { validate, integer, choice, money, dateTime, isMissing } = require('./helpers');
const { VEHICLE_TYPES, FEE_STATUSES } = require('../utils/constants');
const { parseDateTime } = require('../utils/dateTime');

const fee = validate(({ body }, add) => {
  integer(add, 'locationId', body.locationId, { label: 'Location' });
  choice(add, 'vehicleType', body.vehicleType, VEHICLE_TYPES, { label: 'Vehicle type' });
  money(add, 'hourlyRate', body.hourlyRate, { label: 'Hourly rate' });
  money(add, 'dailyRate', body.dailyRate, { label: 'Daily rate', required: false });
  dateTime(add, 'effectiveFrom', body.effectiveFrom, { label: 'Effective from', required: false });
  dateTime(add, 'effectiveTo', body.effectiveTo, { label: 'Effective to', required: false });
  choice(add, 'status', body.status, FEE_STATUSES, { label: 'Status', required: false });

  if (!isMissing(body.effectiveFrom) && !isMissing(body.effectiveTo)) {
    const from = parseDateTime(body.effectiveFrom);
    const to = parseDateTime(body.effectiveTo);
    if (from && to && to <= from) add('effectiveTo', 'Effective to must be after effective from.');
  }
});

module.exports = { fee };
