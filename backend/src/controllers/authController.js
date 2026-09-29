const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { created, success } = require('../utils/response');
const { conflict, unauthorized, forbidden } = require('../utils/errors');

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown so both failures take about the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', BCRYPT_ROUNDS);

const register = asyncHandler(async (req, res) => {
  const { fullName, password, phone } = req.body;
  const email = req.body.email.toLowerCase();

  if (await userModel.emailExists(email)) throw conflict('An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    user = await userModel.create({ fullName, email, passwordHash, phone: phone || null });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw conflict('An account with this email already exists.');
    throw error;
  }

  created(res, { token: signToken(user), user }, 'Account created.');
});

const login = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const auth = await userModel.findAuthByEmail(email);

  const passwordMatches = await bcrypt.compare(req.body.password, auth ? auth.passwordHash : DUMMY_HASH);
  if (!auth || !passwordMatches) throw unauthorized('Incorrect email or password.');
  if (auth.user.status !== 'ACTIVE') throw forbidden('This account has been deactivated. Contact an administrator.');

  success(res, { token: signToken(auth.user), user: auth.user });
});

module.exports = { register, login };
