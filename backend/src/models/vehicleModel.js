const { query } = require('../config/database');
const { sqlToIso } = require('../utils/dateTime');

const toVehicle = (row) =>
  row
    ? {
        vehicleId: row.vehicle_id,
        userId: row.user_id,
        registrationNumber: row.registration_number,
        vehicleType: row.vehicle_type,
        makeModel: row.make_model,
        color: row.color,
        createdAt: sqlToIso(row.created_at),
      }
    : null;

async function listByUser(userId) {
  const rows = await query('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC, vehicle_id DESC', [userId]);
  return rows.map(toVehicle);
}

/**
 * Find a vehicle only if it belongs to the given user.
 * With { forUpdate: true } (inside a transaction) the row is locked until the transaction ends.
 */
async function findOwned(vehicleId, userId, connection, { forUpdate = false } = {}) {
  const rows = await query(
    `SELECT * FROM vehicles WHERE vehicle_id = ? AND user_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [vehicleId, userId],
    connection,
  );
  return toVehicle(rows[0]);
}

async function findByRegistration(registrationNumber) {
  const rows = await query('SELECT * FROM vehicles WHERE registration_number = ?', [registrationNumber]);
  return toVehicle(rows[0]);
}

async function create({ userId, registrationNumber, vehicleType, makeModel, color }) {
  const result = await query(
    `INSERT INTO vehicles (user_id, registration_number, vehicle_type, make_model, color)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, registrationNumber, vehicleType, makeModel, color],
  );
  return findOwned(result.insertId, userId);
}

async function update(vehicleId, userId, { registrationNumber, vehicleType, makeModel, color }) {
  await query(
    `UPDATE vehicles SET registration_number = ?, vehicle_type = ?, make_model = ?, color = ?
     WHERE vehicle_id = ? AND user_id = ?`,
    [registrationNumber, vehicleType, makeModel, color, vehicleId, userId],
  );
  return findOwned(vehicleId, userId);
}

async function remove(vehicleId, userId) {
  const result = await query('DELETE FROM vehicles WHERE vehicle_id = ? AND user_id = ?', [vehicleId, userId]);
  return result.affectedRows > 0;
}

module.exports = { listByUser, findOwned, findByRegistration, create, update, remove };
