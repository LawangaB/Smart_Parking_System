const { query } = require('../config/database');
const { sqlToIso, toSqlDateTime } = require('../utils/dateTime');
const { containsPattern } = require('../utils/sql');

const toLocation = (row) =>
  row
    ? {
        locationId: row.location_id,
        name: row.name,
        address: row.address,
        description: row.description,
        operatingHours: row.operating_hours,
        contactNumber: row.contact_number,
        status: row.status,
        createdAt: sqlToIso(row.created_at),
        ...(row.total_slots !== undefined && { totalSlots: Number(row.total_slots) }),
        ...(row.available_slots !== undefined && { availableSlots: Number(row.available_slots) }),
        ...(row.min_hourly_rate !== undefined && {
          minHourlyRate: row.min_hourly_rate === null ? null : Number(row.min_hourly_rate),
        }),
      }
    : null;

/**
 * List locations with slot counts for a time window.
 * availableSlots = slots that are AVAILABLE and have no overlapping RESERVED/ACTIVE
 * reservation in [window.start, window.end). minHourlyRate is the cheapest current hourly rate.
 */
async function list({ search, includeInactive = false, window, vehicleType }) {
  const startSql = toSqlDateTime(window.start);
  const endSql = toSqlDateTime(window.end);
  const params = [];

  // Placeholders below appear in this exact order in the SQL text.
  let slotTypeClause = '';
  if (vehicleType) {
    slotTypeClause = 'AND s.slot_type = ?';
    params.push(vehicleType);
  }
  params.push(endSql, startSql);

  params.push(startSql, startSql);
  let feeTypeClause = '';
  if (vehicleType) {
    feeTypeClause = 'AND f.vehicle_type = ?';
    params.push(vehicleType);
  }

  const where = [];
  if (!includeInactive) where.push("l.status = 'ACTIVE'");
  if (search) {
    const pattern = containsPattern(search);
    where.push('(l.name LIKE ? OR l.address LIKE ?)');
    params.push(pattern, pattern);
  }

  const rows = await query(
    `SELECT l.*,
       (SELECT COUNT(*) FROM parking_slots s WHERE s.location_id = l.location_id) AS total_slots,
       (SELECT COUNT(*) FROM parking_slots s
         WHERE s.location_id = l.location_id AND s.status = 'AVAILABLE' ${slotTypeClause}
           AND NOT EXISTS (
             SELECT 1 FROM reservations r
             WHERE r.slot_id = s.slot_id AND r.status IN ('RESERVED', 'ACTIVE')
               AND r.start_time < ? AND r.end_time > ?)) AS available_slots,
       (SELECT MIN(f.hourly_rate) FROM parking_fees f
         WHERE f.location_id = l.location_id AND f.status = 'ACTIVE'
           AND f.effective_from <= ? AND (f.effective_to IS NULL OR f.effective_to >= ?)
           ${feeTypeClause}) AS min_hourly_rate
     FROM parking_locations l
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY l.name`,
    params,
  );
  return rows.map(toLocation);
}

/** A single location with its total slots and slots currently in AVAILABLE status. */
async function findById(locationId, connection) {
  const rows = await query(
    `SELECT l.*,
       (SELECT COUNT(*) FROM parking_slots s WHERE s.location_id = l.location_id) AS total_slots,
       (SELECT COUNT(*) FROM parking_slots s
         WHERE s.location_id = l.location_id AND s.status = 'AVAILABLE') AS available_slots
     FROM parking_locations l WHERE l.location_id = ?`,
    [locationId],
    connection,
  );
  return toLocation(rows[0]);
}

async function create({ name, address, description, operatingHours, contactNumber, status }) {
  const result = await query(
    `INSERT INTO parking_locations (name, address, description, operating_hours, contact_number, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, address, description, operatingHours, contactNumber, status],
  );
  return findById(result.insertId);
}

async function update(locationId, { name, address, description, operatingHours, contactNumber, status }) {
  await query(
    `UPDATE parking_locations
     SET name = ?, address = ?, description = ?, operating_hours = ?, contact_number = ?, status = ?
     WHERE location_id = ?`,
    [name, address, description, operatingHours, contactNumber, status, locationId],
  );
  return findById(locationId);
}

async function remove(locationId) {
  const result = await query('DELETE FROM parking_locations WHERE location_id = ?', [locationId]);
  return result.affectedRows > 0;
}

async function count() {
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM parking_locations');
  return Number(total);
}

module.exports = { list, findById, create, update, remove, count };
