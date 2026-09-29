const { validate, text, email, password, phone } = require('./helpers');

const register = validate(({ body }, add) => {
  text(add, 'fullName', body.fullName, { label: 'Full name', min: 2, max: 100 });
  email(add, 'email', body.email);
  password(add, 'password', body.password);
  phone(add, 'phone', body.phone);
});

const login = validate(({ body }, add) => {
  email(add, 'email', body.email);
  if (typeof body.password !== 'string' || body.password === '') add('password', 'Password is required.');
});

module.exports = { register, login };
