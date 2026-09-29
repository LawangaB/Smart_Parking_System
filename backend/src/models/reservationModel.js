const { query } = require('../config/database');
const { sqlToIso, toSqlDateTime } = require('../utils/dateTime');
const { containsPattern } = require('../utils/sql');
const { BLOCKING_RESERVATION_STATUSES } = require('../utils/constants');

const BASE_SELECT = `
  SELECT r.reservation_id, r.user_id, r.vehicle_id, r.slot_id, r.start_time, r.end_time,
         r.fee_amount, r.status, r.created_at,
         v.registration_number, v.vehicle_type, v.make_model, v.color,
         s.slot_number, s.slot_type, s.location_id,
         l.name AS location_name, l.address AS location_address,
         u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
  FROM reservations r
  JOIN vehicles v ON v.vehicle_id = r.vehicle_id
  JOIN parking_slots s ON s.slot_id = r.slot_id
  JOIN parking_locations l ON l.location_id = s.location_id
  JOIN users u ON u.user_id = r.user_id`;

const COUNT_FROM = `
  FROM reservations r
  JOIN vehicles v ON v.vehicle_id = r.vehicle_id
  JOIN parking_slots s ON s.slot_id = r.slot_id
  JOIN parking_locations l ON l.location_id = s.location_id
  JOIN users u ON u.user_id = r.user_id`;

const toReservation = (row) =>
  row
    ? {
        reservationId: row.reservation_id,
        userId: row.user_id,
        vehicleId: row.vehicle_id,
        slotId: row.slot_id,
        startTime: sqlToIso(row.start_time),
        endTime: sqlToIso(row.end_time),
        feeAmount: Number(row.fee_amount),
        status: row.status,
        createdAt: sqlToIso(row.created_at),
        vehicle: {
          registrationNumber: row.registration_number,
          vehicleType: row.vehicle_type,
          makeModel: row.make_model,
          color: row.color,
        },
        slot: { slotNumber: row.slot_number, slotType: row.slot_type },
        location: { locationId: row.location_id, name: row.location_name, address: row.location_address },
        customer: { fullName: row.customer_name, email: row.customer_email, phone: row.customer_phone },
      }
    : null;

async function findById(reservationId, connection) {
  const rows = await query(`${BASE_SELECT} WHERE r.reservation_id = ?`, [reservationId], connection);
  return toReservation(rows[0]);
}

async function findByIdForUser(reservationId, userId) {
  const rows = await query(`${BASE_SELECT} WHERE r.reservation_id = ? AND r.user_id = ?`, [reservationId, userId]);
  return toReservation(rows[0]);
}

/** Shared paging/filtering used by the customer list and the administrator list. */
async function search({ userId, statuses, locationId, search: text, order = 'DESC', limit, offset }) {
  const where = [];
  const params = [];

  if (userId) {
    where.push('r.user_id = ?');
    params.push(userId);
  }
  if (statuses && statuses.length) {
    where.push('r.status IN (?)');
    params.push(statuses);
  }
  if (locationId) {
    where.push('s.location_id = ?');
    params.push(locationId);
  }
  if (text) {
    const pattern = containsPattern(text);
    where.push('(u.full_name LIKE ? OR u.email LIKE ? OR v.registration_number LIKE ? OR l.name LIKE ?)');
    params.push(pattern, pattern, pattern, pattern);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const direction = order === 'ASC' ? 'ASC' : 'DESC';

  const [{ total }] = await query(`SELECT COUNT(*) AS total ${COUNT_FROM} ${clause}`, params);
  const rows = await query(
    `${BASE_SELECT} ${clause} ORDER BY r.start_time ${direction}, r.reservation_id ${direction} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { items: rows.map(toReservation), total: Number(total) };
}

/** Counts and total spend for one customer's dashboard. */
async function summaryForUser(userId) {
  const rows = await query(
    `SELECT status, COUNT(*) AS n, COALESCE(SUM(fee_amount), 0) AS fees
     FROM reservations WHERE user_id = ? GROUP BY status`,
    [userId],
  );
  const byStatus = Object.fromEntries(rows.map((row) => [row.status, { count: Number(row.n), fees: Number(row.fees) }]));
  const count = (status) => byStatus[status]?.count || 0;
  return {
    total: rows.reduce((sum, row) => sum + Number(row.n), 0),
    upcoming: count('RESERVED'),
    active: count('ACTIVE'),
    completed: count('COMPLETED'),
    cancelled: count('CANCELLED'),
    totalSpent: byStatus.COMPLETED?.fees || 0,
  };
}

/** Does another blocking reservation overlap the window for this slot? */
async function slotHasConflict(slotId, start, end, connection) {
  const rows = await query(
    `SELECT reservation_id FROM reservations
     WHERE slot_id = ? AND status IN (?) AND start_time < ? AND end_time > ?
     LIMIT 1`,
    [slotId, BLOCKING_RESERVATION_STATUSES, toSqlDateTime(end), toSqlDateTime(start)],
    connection,
  );
  return rows.length > 0;
}

/** Is this vehicle already booked somewhere else during the window? */
async function vehicleHasConflict(vehicleId, start, end, connection) {
  const rows = await query(
    `SELECT reservation_id FROM reservations
     WHERE vehicle_id = ? AND status IN (?) AND start_time < ? AND end_time > ?
     LIMIT 1`,
    [vehicleId, BLOCKING_RESERVATION_STATUSES, toSqlDateTime(end), toSqlDateTime(start)],
    connection,
  );
  return rows.length > 0;
}

async function insert({ userId, vehicleId, slotId, start, end, feeAmount }, connection) {
  const result = await query(
    `INSERT INTO reservations (user_id, vehicle_id, slot_id, start_time, end_time, fee_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, 'RESERVED')`,
    [userId, vehicleId, slotId, toSqlDateTime(start), toSqlDateTime(end), feeAmount],
    connection,
  );
  return result.insertId;
}

/** Change the status only if it is still `fromStatus`; returns true when a row was updated. */
async function transitionStatus(reservationId, fromStatus, toStatus) {
  const result = await query(
    'UPDATE reservations SET status = ? WHERE reservation_id = ? AND status = ?',
    [toStatus, reservationId, fromStatus],
  );
  return result.affectedRows > 0;
}

/** Cancel a customer's own reservation if it is still upcoming (RESERVED and not yet started). */
async function cancelUpcoming(reservationId, userId, now) {
  const result = await query(
    `UPDATE reservations SET status = 'CANCELLED'
     WHERE reservation_id = ? AND user_id = ? AND status = 'RESERVED' AND start_time > ?`,
    [reservationId, userId, toSqlDateTime(now)],
  );
  return result.affectedRows > 0;
}

/**
 * Time-based lifecycle: finished reservations become COMPLETED and reservations
 * whose period has begun become ACTIVE. Returns the number of rows changed.
 */
async function syncStatuses(now) {
  const nowSql = toSqlDateTime(now);
  const completed = await query(
    `UPDATE reservations SET status = 'COMPLETED'
     WHERE status IN ('RESERVED', 'ACTIVE') AND end_time <= ?`,
    [nowSql],
  );
  const activated = await query(
    `UPDATE reservations SET status = 'ACTIVE'
     WHERE status = 'RESERVED' AND start_time <= ? AND end_time > ?`,
    [nowSql, nowSql],
  );
  return completed.affectedRows + activated.affectedRows;
}

module.exports = {
  findById,
  findByIdForUser,
  search,
  summaryForUser,
  slotHasConflict,
  vehicleHasConflict,
  insert,
  transitionStatus,
  cancelUpcoming,
  syncStatuses,
};
