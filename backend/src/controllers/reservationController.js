const reservationModel = require('../models/reservationModel');
const reservationService = require('../services/reservationService');
const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const { toId } = require('../utils/ids');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { parseStatusList } = require('../utils/queryParams');
const { notFound } = require('../utils/errors');

const create = asyncHandler(async (req, res) => {
  const { vehicleId, slotId, startTime, endTime } = req.body;
  const reservation = await reservationService.createReservation(req.user, {
    vehicleId: Number(vehicleId),
    slotId: Number(slotId),
    startTime,
    endTime,
  });
  created(res, reservation, 'Reservation confirmed.');
});

/** GET /api/reservations?status=RESERVED,ACTIVE&order=asc&page=&limit= (the caller's own bookings) */
const listMine = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { items, total } = await reservationModel.search({
    userId: req.user.userId,
    statuses: parseStatusList(req.query.status),
    order: String(req.query.order || 'desc').toUpperCase(),
    limit,
    offset,
  });
  success(res, { items, pagination: buildPagination(page, limit, total) });
});

const summary = asyncHandler(async (req, res) => {
  success(res, await reservationModel.summaryForUser(req.user.userId));
});

const getOne = asyncHandler(async (req, res) => {
  const reservation = await reservationModel.findByIdForUser(toId(req.params.id, 'Reservation ID'), req.user.userId);
  if (!reservation) throw notFound('Reservation not found.');
  success(res, reservation);
});

const cancel = asyncHandler(async (req, res) => {
  const reservation = await reservationService.cancelReservation(req.user, toId(req.params.id, 'Reservation ID'));
  success(res, reservation, 200, 'Reservation cancelled.');
});

module.exports = { create, listMine, summary, getOne, cancel };
