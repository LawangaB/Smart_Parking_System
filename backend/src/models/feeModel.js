const { query } = require('../config/database');
const { sqlToIso } = require('../utils/dateTime');

const toFee = (row) =>
  row
    ? {
        feeId: row.fee_id,
        locationId: row.location_id,
        ...(row.location_name !== undefined && { locationName: row.location_name }),
        vehicleType: row.vehicle_type,
        hourlyRate: Number(row.hourly_rate),
        dailyRate: row.daily_rate === null ? null : Number(row.daily_rate),
        effectiveFrom: sqlToIso(row.effective_from),
        effectiveTo: sqlToIso(row.effective_to),
        status: row.status,
      }
    : null;

const SELECT_WITH_LOCATION = `
  SELECT f.*, l.name AS location_name
  FROM parking_fees f
  JOIN parking_locations l ON l.location_id = f.location_id`;

async function list({ locationId } = {}) {
  const params = [];
  let where = '';
  if (locationId) {
    where = 'WHERE f.location_id = ?';
    params.push(locationId);
  }
  const rows = await query(
    `${SELECT_WITH_LOCATION} ${where} ORDER BY l.name, f.vehicle_type, f.effective_from DESC`,
    params,
  );
  return rows.map(toFee);
}

async function findById(feeId) {
  const rows = await query(`${SELECT_WITH_LOCATION} WHERE f.fee_id = ?`, [feeId]);
  return toFee(rows[0]);
}

async function create({ locationId, vehicleType, hourlyRate, dailyRate, effectiveFrom, effectiveTo, status }) {
  const result = await query(
    `INSERT INTO parking_fees
       (location_id, vehicle_type, hourly_rate, daily_rate, effective_from, effective_to, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [locationId, vehicleType, hourlyRate, dailyRate, effectiveFrom, effectiveTo, status],
  );
  return findById(result.insertId);
}

async function update(feeId, { locationId, vehicleType, hourlyRate, dailyRate, effectiveFrom, effectiveTo, status }) {
  await query(
    `UPDATE parking_fees
     SET location_id = ?, vehicle_type = ?, hourly_rate = ?, daily_rate = ?,
         effective_from = ?, effective_to = ?, status = ?
     WHERE fee_id = ?`,
    [locationId, vehicleType, hourlyRate, dailyRate, effectiveFrom, effectiveTo, status, feeId],
  );
  return findById(feeId);
}

async function remove(feeId) {
  const result = await query('DELETE FROM parking_fees WHERE fee_id = ?', [feeId]);
  return result.affectedRows > 0;
}

/** The ACTIVE fee that applies to a location and vehicle type at a moment in time (sql datetime). */
async function findApplicable(locationId, vehicleType, atSql, connection) {
  const rows = await query(
    `SELECT f.* FROM parking_fees f
     WHERE f.location_id = ? AND f.vehicle_type = ? AND f.status = 'ACTIVE'
       AND f.effective_from <= ? AND (f.effective_to IS NULL OR f.effective_to >= ?)
     ORDER BY f.effective_from DESC, f.fee_id DESC
     LIMIT 1`,
    [locationId, vehicleType, atSql, atSql],
    connection,
  );
  return toFee(rows[0]);
}

/** One current fee per vehicle type for a location (for display to customers). */
async function listEffectiveByLocation(locationId, atSql, connection) {
  const rows = await query(
    `SELECT f.* FROM parking_fees f
     WHERE f.location_id = ? AND f.status = 'ACTIVE'
       AND f.effective_from <= ? AND (f.effective_to IS NULL OR f.effective_to >= ?)
     ORDER BY f.vehicle_type, f.effective_from DESC, f.fee_id DESC`,
    [locationId, atSql, atSql],
    connection,
  );
  const seen = new Set();
  return rows
    .filter((row) => {
      if (seen.has(row.vehicle_type)) return false;
      seen.add(row.vehicle_type);
      return true;
    })
    .map(toFee);
}

module.exports = { list, findById, create, update, remove, findApplicable, listEffectiveByLocation };
