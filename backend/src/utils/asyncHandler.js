/** Forward rejected promises from async route handlers to Express' error middleware. */
module.exports = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
