const { query } = require('../config/database');
const { sqlToIso } = require('../utils/dateTime');
const { containsPattern } = require('../utils/sql');

const COLUMNS = 'user_id, full_name, email, phone, role, status, created_at';

const toUser = (row) =>
  row
    ? {
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        status: row.status,
        createdAt: sqlToIso(row.created_at),
      }
    : null;

async function findById(userId, connection) {
  const rows = await query(`SELECT ${COLUMNS} FROM users WHERE user_id = ?`, [userId], connection);
  return toUser(rows[0]);
}

/** Returns { user, passwordHash } or null. Used only for authentication. */
async function findAuthByEmail(email) {
  const rows = await query(`SELECT ${COLUMNS}, password_hash FROM users WHERE email = ?`, [email]);
  if (!rows[0]) return null;
  return { user: toUser(rows[0]), passwordHash: rows[0].password_hash };
}

async function findAuthById(userId) {
  const rows = await query('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
  return rows[0] ? rows[0].password_hash : null;
}

async function emailExists(email) {
  const rows = await query('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0;
}

async function create({ fullName, email, passwordHash, phone = null, role = 'CUSTOMER' }) {
  const result = await query(
    'INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
    [fullName, email, passwordHash, phone, role],
  );
  return findById(result.insertId);
}

async function updateProfile(userId, { fullName, phone }) {
  await query('UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?', [fullName, phone, userId]);
  return findById(userId);
}

async function updatePassword(userId, passwordHash) {
  await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
}

async function updateStatus(userId, status) {
  await query('UPDATE users SET status = ? WHERE user_id = ?', [status, userId]);
  return findById(userId);
}

async function list({ search, status, role, limit, offset }) {
  const where = [];
  const params = [];

  if (search) {
    const pattern = containsPattern(search);
    where.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(pattern, pattern, pattern);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (role) {
    where.push('role = ?');
    params.push(role);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM users ${clause}`, params);
  const rows = await query(
    `SELECT ${COLUMNS} FROM users ${clause} ORDER BY created_at DESC, user_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { items: rows.map(toUser), total: Number(total) };
}

module.exports = {
  findById,
  findAuthByEmail,
  findAuthById,
  emailExists,
  create,
  updateProfile,
  updatePassword,
  updateStatus,
  list,
};
