const { AppError } = require('../utils/errors');
const { parseDateTime } = require('../utils/dateTime');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isMissing = (value) => value === undefined || value === null || value === '';

/**
 * Build a validation middleware. `rules({ body, query, params }, add)` calls
 * add(field, message) for every problem. String values in the body are trimmed first.
 * Failures become a 422 response: { success: false, message, errors: [{ field, message }] }.
 */
function validate(rules) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') req.body[key] = value.trim();
      }
    }

    const errors = [];
    const add = (field, message) => errors.push({ field, message });
    rules({ body: req.body || {}, query: req.query || {}, params: req.params || {} }, add);

    if (errors.length > 0) return next(new AppError('Validation failed.', 422, errors));
    return next();
  };
}

function text(add, field, value, { label = field, required = true, min = 1, max = 255 } = {}) {
  if (isMissing(value)) {
    if (required) add(field, `${label} is required.`);
    return;
  }
  if (typeof value !== 'string') return add(field, `${label} must be text.`);
  if (value.length < min) return add(field, `${label} must be at least ${min} characters.`);
  if (value.length > max) return add(field, `${label} must be at most ${max} characters.`);
}

function email(add, field, value, { label = 'Email' } = {}) {
  if (isMissing(value)) return add(field, `${label} is required.`);
  if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) return add(field, `${label} must be a valid email address.`);
  if (value.length > 150) add(field, `${label} must be at most 150 characters.`);
}

/** 8-72 characters (bcrypt limit) with at least one letter and one digit. */
function password(add, field, value, { label = 'Password' } = {}) {
  if (isMissing(value)) return add(field, `${label} is required.`);
  if (typeof value !== 'string') return add(field, `${label} must be text.`);
  if (value.length < 8 || value.length > 72) return add(field, `${label} must be 8 to 72 characters.`);
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) add(field, `${label} must contain at least one letter and one number.`);
}

function phone(add, field, value, { required = false } = {}) {
  if (isMissing(value)) {
    if (required) add(field, 'Phone number is required.');
    return;
  }
  if (typeof value !== 'string' || !/^[0-9+()\-\s]{7,20}$/.test(value)) {
    add(field, 'Phone number may contain digits, spaces, + ( ) - and must be 7 to 20 characters.');
  }
}

function choice(add, field, value, options, { label = field, required = true } = {}) {
  if (isMissing(value)) {
    if (required) add(field, `${label} is required.`);
    return;
  }
  if (!options.includes(value)) add(field, `${label} must be one of: ${options.join(', ')}.`);
}

function integer(add, field, value, { label = field, required = true, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (isMissing(value)) {
    if (required) add(field, `${label} is required.`);
    return;
  }
  const number = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  if (!Number.isInteger(number)) return add(field, `${label} must be a whole number.`);
  if (number < min) return add(field, `${label} must be at least ${min}.`);
  if (number > max) add(field, `${label} must be at most ${max}.`);
}

function money(add, field, value, { label = field, required = true, min = 0, max = 99_999_999.99 } = {}) {
  if (isMissing(value)) {
    if (required) add(field, `${label} is required.`);
    return;
  }
  const number = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  if (!Number.isFinite(number)) return add(field, `${label} must be a number.`);
  if (number < min) return add(field, `${label} cannot be less than ${min}.`);
  if (number > max) return add(field, `${label} is too large.`);
  if (Math.round(number * 100) !== Number((number * 100).toFixed(6))) add(field, `${label} can have at most 2 decimal places.`);
}

function dateTime(add, field, value, { label = field, required = true } = {}) {
  if (isMissing(value)) {
    if (required) add(field, `${label} is required.`);
    return;
  }
  if (!parseDateTime(value)) add(field, `${label} must be a valid date and time such as 2026-10-01T10:00:00.`);
}

module.exports = { validate, isMissing, text, email, password, phone, choice, integer, money, dateTime };
