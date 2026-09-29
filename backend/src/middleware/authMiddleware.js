const userModel = require('../models/userModel');
const { verifyToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/errors');

function readBearerToken(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Load the user behind a token. The account is re-read on every request so a deactivated user loses access immediately. */
async function loadUser(token) {
  const payload = verifyToken(token);
  const user = await userModel.findById(payload.sub);
  if (!user) throw unauthorized('This account no longer exists.');
  if (user.status !== 'ACTIVE') throw forbidden('This account has been deactivated. Contact an administrator.');
  return user;
}

/** Require a valid "Authorization: Bearer <token>" header. Sets req.user. */
async function authenticate(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) throw unauthorized('Authentication required.');
    req.user = await loadUser(token);
    next();
  } catch (error) {
    next(error);
  }
}

/** For public endpoints that tailor their output to logged-in users. Bad or missing tokens are treated as anonymous. */
async function optionalAuthenticate(req, res, next) {
  const token = readBearerToken(req);
  if (token) {
    try {
      req.user = await loadUser(token);
    } catch {
      /* ignore: continue as an anonymous visitor */
    }
  }
  next();
}

module.exports = { authenticate, optionalAuthenticate };
