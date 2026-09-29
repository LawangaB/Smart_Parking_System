const { query } = require('../config/database');
const { toSqlDateTime } = require('../utils/dateTime');

const scalar = async (sql, params = []) => {
  const rows = await query(sql, params);
  return Number(rows[0].n);
};

/**
 * Figures for the administrator dashboard.
 * - users: customer accounts (administrators are not counted)
 * - availableSlots: slots in AVAILABLE status that are not reserved right now
 * - activeReservations: upcoming (RESERVED) plus in-progress (ACTIVE) reservations
 * - totalFees: fees of COMPLETED reservations (payments are out of scope)
 */
async function getDashboardStats(now) {
  const nowSql = toSqlDateTime(now);

  const [users, vehicles, statusRows, locationRows] = await Promise.all([
    scalar("SELECT COUNT(*) AS n FROM users WHERE role = 'CUSTOMER'"),
    scalar('SELECT COUNT(*) AS n FROM vehicles'),
    query(
      `SELECT status, COUNT(*) AS n, COALESCE(SUM(fee_amount), 0) AS fees
       FROM reservations GROUP BY status`,
    ),
    query(
      `SELECT l.location_id, l.name, l.status,
         (SELECT COUNT(*) FROM parking_slots s WHERE s.location_id = l.location_id) AS total_slots,
         (SELECT COUNT(*) FROM parking_slots s
           WHERE s.location_id = l.location_id AND s.status = 'AVAILABLE'
             AND NOT EXISTS (
               SELECT 1 FROM reservations r
               WHERE r.slot_id = s.slot_id AND r.status IN ('RESERVED', 'ACTIVE')
                 AND r.start_time <= ? AND r.end_time > ?)) AS available_slots,
         (SELECT COUNT(*) FROM reservations r JOIN parking_slots s ON s.slot_id = r.slot_id
           WHERE s.location_id = l.location_id AND r.status IN ('RESERVED', 'ACTIVE')) AS open_reservations,
         (SELECT COALESCE(SUM(r.fee_amount), 0) FROM reservations r JOIN parking_slots s ON s.slot_id = r.slot_id
           WHERE s.location_id = l.location_id AND r.status = 'COMPLETED') AS total_fees
       FROM parking_locations l
       ORDER BY l.name`,
      [nowSql, nowSql],
    ),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, { count: Number(row.n), fees: Number(row.fees) }]));
  const count = (status) => byStatus[status]?.count || 0;

  const locationSummary = locationRows.map((row) => ({
    locationId: row.location_id,
    name: row.name,
    status: row.status,
    totalSlots: Number(row.total_slots),
    availableSlots: Number(row.available_slots),
    openReservations: Number(row.open_reservations),
    totalFees: Number(row.total_fees),
  }));

  return {
    users,
    vehicles,
    locations: locationSummary.length,
    slots: locationSummary.reduce((sum, row) => sum + row.totalSlots, 0),
    availableSlots: locationSummary.reduce((sum, row) => sum + row.availableSlots, 0),
    activeReservations: count('RESERVED') + count('ACTIVE'),
    completedReservations: count('COMPLETED'),
    cancelledReservations: count('CANCELLED'),
    totalFees: byStatus.COMPLETED?.fees || 0,
    locationSummary,
  };
}

module.exports = { getDashboardStats };
