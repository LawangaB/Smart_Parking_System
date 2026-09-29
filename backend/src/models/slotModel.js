const { query } = require('../config/database');
const { sqlToIso, toSqlDateTime } = require('../utils/dateTime');

/** SQL fragment: the slot `s` has a RESERVED/ACTIVE reservation overlapping the window. Params: (end, start). */
const OVERLAP_EXISTS = `EXISTS (
  SELECT 1 FROM reservations r
  WHERE r.slot_id = s.slot_id AND r.status IN ('RESERVED', 'ACTIVE')
    AND r.start_time < ? AND r.end_time > ?)`;

const toSlot = (row) => {
  if (!row) return null;
  const hasWindow = row.is_reserved !== undefined;
  const isReserved = hasWindow ? Boolean(row.is_reserved) : false;
  return {
    slotId: row.slot_id,
    locationId: row.location_id,
    slotNumber: row.slot_number,
    slotType: row.slot_type,
    status: row.status,
    // What a customer should see for the requested period.
    displayStatus: row.status === 'AVAILABLE' && isReserved ? 'RESERVED' : row.status,
    createdAt: sqlToIso(row.created_at),
  };
};

/** All slots of a location. With a window, displayStatus reflects reservations in that window. */
async function listByLocation(locationId, { window, vehicleType, status } = {}) {
  const params = [];
  let select = 's.*';
  if (window) {
    select += `, ${OVERLAP_EXISTS} AS is_reserved`;
    params.push(toSqlDateTime(window.end), toSqlDateTime(window.start));
  }

  const where = ['s.location_id = ?'];
  params.push(locationId);
  if (vehicleType) {
    where.push('s.slot_type = ?');
    params.push(vehicleType);
  }
  if (status) {
    where.push('s.status = ?');
    params.push(status);
  }

  const rows = await query(
    `SELECT ${select} FROM parking_slots s WHERE ${where.join(' AND ')} ORDER BY s.slot_number`,
    params,
  );
  return rows.map(toSlot);
}

/** Slots in AVAILABLE status with no overlapping reservation in the window. */
async function listAvailable(locationId, window, vehicleType) {
  const params = [locationId, toSqlDateTime(window.end), toSqlDateTime(window.start)];
  let typeClause = '';
  if (vehicleType) {
    typeClause = 'AND s.slot_type = ?';
    params.push(vehicleType);
  }
  const rows = await query(
    `SELECT s.* FROM parking_slots s
     WHERE s.location_id = ? AND s.status = 'AVAILABLE' AND NOT ${OVERLAP_EXISTS} ${typeClause}
     ORDER BY s.slot_number`,
    params,
  );
  return rows.map(toSlot);
}

async function findById(slotId, connection) {
  const rows = await query('SELECT * FROM parking_slots WHERE slot_id = ?', [slotId], connection);
  return toSlot(rows[0]);
}

/** Lock the slot row for the rest of the transaction (serialises bookings of the same slot). */
async function findByIdForUpdate(slotId, connection) {
  const rows = await query('SELECT * FROM parking_slots WHERE slot_id = ? FOR UPDATE', [slotId], connection);
  return toSlot(rows[0]);
}

async function findNumbers(locationId, slotNumbers) {
  if (slotNumbers.length === 0) return [];
  const rows = await query(
    'SELECT slot_number FROM parking_slots WHERE location_id = ? AND slot_number IN (?)',
    [locationId, slotNumbers],
  );
  return rows.map((row) => row.slot_number);
}

async function create({ locationId, slotNumber, slotType, status }) {
  const result = await query(
    'INSERT INTO parking_slots (location_id, slot_number, slot_type, status) VALUES (?, ?, ?, ?)',
    [locationId, slotNumber, slotType, status],
  );
  return findById(result.insertId);
}

/** Insert many slots in one statement. `slots` = [{ slotNumber, slotType }] */
async function createMany(locationId, slots, status = 'AVAILABLE') {
  const values = slots.map((slot) => [locationId, slot.slotNumber, slot.slotType, status]);
  const result = await query(
    'INSERT INTO parking_slots (location_id, slot_number, slot_type, status) VALUES ?',
    [values],
  );
  return result.affectedRows;
}

async function update(slotId, { slotNumber, slotType }) {
  await query('UPDATE parking_slots SET slot_number = ?, slot_type = ? WHERE slot_id = ?', [
    slotNumber,
    slotType,
    slotId,
  ]);
  return findById(slotId);
}

async function updateStatus(slotId, status) {
  await query('UPDATE parking_slots SET status = ? WHERE slot_id = ?', [status, slotId]);
  return findById(slotId);
}

async function remove(slotId) {
  const result = await query('DELETE FROM parking_slots WHERE slot_id = ?', [slotId]);
  return result.affectedRows > 0;
}

module.exports = {
  listByLocation,
  listAvailable,
  findById,
  findByIdForUpdate,
  findNumbers,
  create,
  createMany,
  update,
  updateStatus,
  remove,
};
