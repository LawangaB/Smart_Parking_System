const { validate, text, password, phone, choice, isMissing } = require('./helpers');
const { USER_STATUSES } = require('../utils/constants');

const updateProfile = validate(({ body }, add) => {
  text(add, 'fullName', body.fullName, { label: 'Full name', min: 2, max: 100 });
  phone(add, 'phone', body.phone);

  // Changing the password is optional, but needs the current password.
  if (!isMissing(body.newPassword) || !isMissing(body.currentPassword)) {
    if (isMissing(body.currentPassword)) add('currentPassword', 'Enter your current password to set a new one.');
    password(add, 'newPassword', body.newPassword, { label: 'New password' });
  }
});

const updateStatus = validate(({ body }, add) => {
  choice(add, 'status', body.status, USER_STATUSES, { label: 'Status' });
});

module.exports = { updateProfile, updateStatus };
