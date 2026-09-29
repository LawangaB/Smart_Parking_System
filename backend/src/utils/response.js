/** Consistent success envelope: { success: true, data, message? } */
function success(res, data = null, statusCode = 200, message) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

const created = (res, data, message) => success(res, data, 201, message);

module.exports = { success, created };
