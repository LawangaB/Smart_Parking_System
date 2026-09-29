const { validate, text, choice } = require('./helpers');
const { VEHICLE_TYPES } = require('../utils/constants');

const REGISTRATION_PATTERN = /^[A-Z0-9][A-Z0-9 -]{2,29}$/;

const vehicle = validate(({ body }, add) => {
  if (typeof body.registrationNumber === 'string') body.registrationNumber = body.registrationNumber.toUpperCase();
  text(add, 'registrationNumber', body.registrationNumber, { label: 'Registration number', max: 30 });
  if (typeof body.registrationNumber === 'string' && body.registrationNumber && !REGISTRATION_PATTERN.test(body.registrationNumber)) {
    add('registrationNumber', 'Registration number may only contain letters, numbers, spaces and hyphens (3 to 30 characters).');
  }
  choice(add, 'vehicleType', body.vehicleType, VEHICLE_TYPES, { label: 'Vehicle type' });
  text(add, 'makeModel', body.makeModel, { label: 'Make/model', required: false, max: 100 });
  text(add, 'color', body.color, { label: 'Color', required: false, max: 50 });
});

module.exports = { vehicle };
