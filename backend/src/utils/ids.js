const { badRequest } = require('./errors');

/** Convert a route/query value to a positive integer id or throw a 400 error. */
function toId(value, label = 'ID') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`${label} must be a positive integer.`);
  }
  return id;
}

module.exports = { toId };
