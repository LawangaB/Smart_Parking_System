const config = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || 500;
  let message = err.message;
  const errors = err.errors || undefined;

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session has expired. Please log in again.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    status = 401;
    message = 'Invalid authentication token.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request body is too large.';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'A record with the same unique value already exists.';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409;
    message = 'This record is still used by other data (for example reservations) and cannot be deleted.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 422;
    message = 'A related record does not exist.';
  } else if (!err.isOperational) {
    console.error(err);
    status = 500;
    message = config.env === 'production' ? 'Internal server error.' : `Internal server error: ${err.message}`;
  }

  return res.status(status).json({ success: false, message, ...(errors && { errors }) });
}

module.exports = { notFoundHandler, errorHandler };
