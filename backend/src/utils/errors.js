/** An error that is safe to show to API clients. */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors; // optional list of { field, message }
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

const badRequest = (message, errors) => new AppError(message, 400, errors);
const unauthorized = (message = 'Authentication required.') => new AppError(message, 401);
const forbidden = (message = 'You do not have permission to perform this action.') =>
  new AppError(message, 403);
const notFound = (message = 'Resource not found.') => new AppError(message, 404);
const conflict = (message) => new AppError(message, 409);
const unprocessable = (message, errors) => new AppError(message, 422, errors);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, unprocessable };
