const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { toId } = require('../utils/ids');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { AppError, notFound, conflict, badRequest } = require('../utils/errors');
const { USER_STATUSES, ROLES } = require('../utils/constants');

const getMe = asyncHandler(async (req, res) => {
  success(res, req.user);
});

const updateMe = asyncHandler(async (req, res) => {
  const { fullName, phone, currentPassword, newPassword } = req.body;

  if (newPassword) {
    const currentHash = await userModel.findAuthById(req.user.userId);
    const matches = await bcrypt.compare(currentPassword || '', currentHash || '');
    if (!matches) {
      // 422 (not 401): the person is signed in, one field is wrong. A 401 would look like an expired session.
      const message = 'Your current password is incorrect.';
      throw new AppError(message, 422, [{ field: 'currentPassword', message }]);
    }
    await userModel.updatePassword(req.user.userId, await bcrypt.hash(newPassword, 10));
  }

  const user = await userModel.updateProfile(req.user.userId, { fullName, phone: phone || null });
  success(res, user, 200, 'Profile updated.');
});

/** Administrator: paginated list with ?search=&status=&role=&page=&limit= */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { status, role, search } = req.query;
  if (status && !USER_STATUSES.includes(status)) throw badRequest(`Status must be one of: ${USER_STATUSES.join(', ')}.`);
  if (role && !Object.values(ROLES).includes(role)) throw badRequest(`Role must be one of: ${Object.values(ROLES).join(', ')}.`);

  const { items, total } = await userModel.list({ search, status, role, limit, offset });
  success(res, { items, pagination: buildPagination(page, limit, total) });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const userId = toId(req.params.id, 'User ID');
  if (userId === req.user.userId) throw conflict('You cannot change the status of your own account.');

  const existing = await userModel.findById(userId);
  if (!existing) throw notFound('User not found.');

  const user = await userModel.updateStatus(userId, req.body.status);
  success(res, user, 200, `Account ${user.status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
});

module.exports = { getMe, updateMe, listUsers, updateUserStatus };
