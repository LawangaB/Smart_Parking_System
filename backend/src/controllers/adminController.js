const reservationModel = require('../models/reservationModel');
const statsModel = require('../models/statsModel');
const reservationService = require('../services/reservationService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { toId } = require('../utils/ids');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { parseStatusList } = require('../utils/queryParams');

/** GET /api/admin/dashboard */
const getDashboard = asyncHandler(async (req, res) => {
  await reservationService.refreshStatuses();
  const [stats, recent] = await Promise.all([
    statsModel.getDashboardStats(new Date()),
    reservationModel.search({ limit: 5, offset: 0 }),
  ]);
  success(res, { ...stats, recentReservations: recent.items });
});

/** GET /api/admin/reservations?status=&locationId=&search=&page=&limit= */
const listReservations = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { items, total } = await reservationModel.search({
    statuses: parseStatusList(req.query.status),
    locationId: req.query.locationId ? toId(req.query.locationId, 'Location ID') : undefined,
    search: req.query.search,
    order: String(req.query.order || 'desc').toUpperCase(),
    limit,
    offset,
  });
  success(res, { items, pagination: buildPagination(page, limit, total) });
});

/** PATCH /api/admin/reservations/:id/status */
const updateReservationStatus = asyncHandler(async (req, res) => {
  const reservation = await reservationService.updateStatusAsAdmin(toId(req.params.id, 'Reservation ID'), req.body.status);
  success(res, reservation, 200, 'Reservation status updated.');
});

module.exports = { getDashboard, listReservations, updateReservationStatus };
