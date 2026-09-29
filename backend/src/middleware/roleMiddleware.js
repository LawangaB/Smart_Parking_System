const { unauthorized, forbidden } = require('../utils/errors');

/** Allow only users whose role is one of `roles`. Use after `authenticate`. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  return next();
};

module.exports = { authorize };
