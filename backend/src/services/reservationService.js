const { withTransaction } = require('../config/database');
const vehicleModel = require('../models/vehicleModel');
const slotModel = require('../models/slotModel');
const locationModel = require('../models/locationModel');
const reservationModel = require('../models/reservationModel');
const feeService = require('./feeService');
const { parseWindow } = require('../utils/timeWindow');
const { conflict, notFound, unprocessable } = require('../utils/errors');
const { sqlToIso, toSqlDateTime } = require('../utils/dateTime');
const { RESERVATION_TRANSITIONS } = require('../utils/constants');

/**
 * Create a reservation (steps follow backend.md):
 * 1. validate the time range  2. vehicle belongs to the user  3. slot exists
 * 4. slot/location can be booked  5. no conflicting reservation  6-7. look up and calculate the fee
 * 8. insert inside a transaction  9. return the created reservation.
 *
 * Concurrency: the vehicle row and then the slot row are locked with SELECT ... FOR UPDATE
 * (always in that order, so transactions cannot deadlock each other). Two requests for the same
 * slot - or the same vehicle - are therefore processed one after the other. The transaction
 * runs at READ COMMITTED so the conflict checks that follow the locks see the reservation the
 * other request just committed; under MySQL's default REPEATABLE READ they could still read an
 * older snapshot and let a double booking through.
 */
async function createReservation(user, { vehicleId, slotId, startTime, endTime }) {
  const { start, end } = parseWindow(startTime, endTime, { requireFuture: true, enforceLimits: true });

  return withTransaction(async (connection) => {
    const vehicle = await vehicleModel.findOwned(vehicleId, user.userId, connection, { forUpdate: true });
    if (!vehicle) throw notFound('Vehicle not found.');

    const slot = await slotModel.findByIdForUpdate(slotId, connection);
    if (!slot) throw notFound('Parking slot not found.');

    const location = await locationModel.findById(slot.locationId, connection);
    if (!location || location.status !== 'ACTIVE') {
      throw conflict('This parking location is not open for reservations.');
    }
    if (slot.status !== 'AVAILABLE') {
      throw conflict('The selected parking slot is not available for reservations.');
    }
    if (slot.slotType !== vehicle.vehicleType) {
      throw unprocessable(
        `This is a ${slot.slotType.toLowerCase()} slot but the selected vehicle is a ${vehicle.vehicleType.toLowerCase()}.`,
      );
    }

    if (await reservationModel.slotHasConflict(slot.slotId, start, end, connection)) {
      throw conflict('The selected parking slot is not available for the requested time.');
    }
    if (await reservationModel.vehicleHasConflict(vehicle.vehicleId, start, end, connection)) {
      throw conflict('This vehicle already has a reservation during the requested time.');
    }

    const { amount } = await feeService.priceReservation(slot.locationId, vehicle.vehicleType, start, end, connection);

    const reservationId = await reservationModel.insert(
      { userId: user.userId, vehicleId: vehicle.vehicleId, slotId: slot.slotId, start, end, feeAmount: amount },
      connection,
    );
    return reservationModel.findById(reservationId, connection);
  }, { isolationLevel: 'READ COMMITTED' });
}

/** Customer cancellation: only upcoming (RESERVED, not yet started) reservations of their own. */
async function cancelReservation(user, reservationId) {
  const cancelled = await reservationModel.cancelUpcoming(reservationId, user.userId, new Date());
  if (!cancelled) {
    const existing = await reservationModel.findByIdForUser(reservationId, user.userId);
    if (!existing) throw notFound('Reservation not found.');
    throw conflict('Only upcoming reservations that have not started can be cancelled.');
  }
  return reservationModel.findById(reservationId);
}

/** Administrator status change, limited to the transitions in RESERVATION_TRANSITIONS. */
async function updateStatusAsAdmin(reservationId, newStatus) {
  const existing = await reservationModel.findById(reservationId);
  if (!existing) throw notFound('Reservation not found.');

  const allowed = RESERVATION_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(newStatus)) {
    throw conflict(`A ${existing.status.toLowerCase()} reservation cannot be changed to ${newStatus.toLowerCase()}.`);
  }

  const changed = await reservationModel.transitionStatus(reservationId, existing.status, newStatus);
  if (!changed) throw conflict('The reservation was changed by someone else. Reload and try again.');
  return reservationModel.findById(reservationId);
}

/** Fee estimate for the booking screen. Uses exactly the same rules as createReservation. */
async function getQuote({ locationId, vehicleType, startTime, endTime }) {
  const { start, end } = parseWindow(startTime, endTime);

  const location = await locationModel.findById(locationId);
  if (!location || location.status !== 'ACTIVE') throw notFound('Parking location not found.');

  const { fee, billableHours, amount } = await feeService.priceReservation(locationId, vehicleType, start, end);
  return {
    locationId,
    vehicleType,
    startTime: sqlToIso(toSqlDateTime(start)),
    endTime: sqlToIso(toSqlDateTime(end)),
    billableHours,
    hourlyRate: fee.hourlyRate,
    dailyRate: fee.dailyRate,
    estimatedFee: amount,
  };
}

/** Apply the time-based lifecycle (RESERVED -> ACTIVE -> COMPLETED). */
function refreshStatuses() {
  return reservationModel.syncStatuses(new Date());
}

module.exports = { createReservation, cancelReservation, updateStatusAsAdmin, getQuote, refreshStatuses };
