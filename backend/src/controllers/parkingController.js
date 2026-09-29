const locationModel = require('../models/locationModel');
const slotModel = require('../models/slotModel');
const feeModel = require('../models/feeModel');
const reservationService = require('../services/reservationService');
const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const { toId } = require('../utils/ids');
const { parseWindow } = require('../utils/timeWindow');
const { toSqlDateTime, sqlToIso } = require('../utils/dateTime');
const { notFound, conflict, unprocessable } = require('../utils/errors');

const isAdmin = (req) => req.user?.role === 'ADMIN';

/** Requested window, or "the next hour" when the client did not send one. */
function resolveWindow(query) {
  if (query.startTime && query.endTime) return parseWindow(query.startTime, query.endTime);
  const start = new Date();
  return { start, end: new Date(start.getTime() + 3_600_000) };
}

/** Load a location; customers and visitors can only see ACTIVE ones. */
async function requireVisibleLocation(req, locationId) {
  const location = await locationModel.findById(locationId);
  if (!location || (location.status !== 'ACTIVE' && !isAdmin(req))) throw notFound('Parking location not found.');
  return location;
}

// ---------------------------------------------------------------- locations

const listLocations = asyncHandler(async (req, res) => {
  const items = await locationModel.list({
    search: req.query.search,
    includeInactive: isAdmin(req),
    window: resolveWindow(req.query),
    vehicleType: req.query.vehicleType,
  });
  success(res, items);
});

const getLocation = asyncHandler(async (req, res) => {
  const locationId = toId(req.params.id, 'Location ID');
  const location = await requireVisibleLocation(req, locationId);
  const fees = await feeModel.listEffectiveByLocation(locationId, toSqlDateTime(new Date()));
  success(res, { ...location, fees });
});

const locationFields = (body) => ({
  name: body.name,
  address: body.address,
  description: body.description || null,
  operatingHours: body.operatingHours || null,
  contactNumber: body.contactNumber || null,
  status: body.status || 'ACTIVE',
});

const createLocation = asyncHandler(async (req, res) => {
  created(res, await locationModel.create(locationFields(req.body)), 'Parking location created.');
});

const updateLocation = asyncHandler(async (req, res) => {
  const locationId = toId(req.params.id, 'Location ID');
  if (!(await locationModel.findById(locationId))) throw notFound('Parking location not found.');
  success(res, await locationModel.update(locationId, locationFields(req.body)), 200, 'Parking location updated.');
});

const deleteLocation = asyncHandler(async (req, res) => {
  const locationId = toId(req.params.id, 'Location ID');
  try {
    if (!(await locationModel.remove(locationId))) throw notFound('Parking location not found.');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw conflict('This location has slots with reservations, so it cannot be deleted. Set it to inactive instead.');
    }
    throw error;
  }
  success(res, null, 200, 'Parking location deleted.');
});

// -------------------------------------------------------------------- slots

const listSlots = asyncHandler(async (req, res) => {
  const locationId = toId(req.params.locationId, 'Location ID');
  await requireVisibleLocation(req, locationId);

  const window = req.query.startTime && req.query.endTime ? parseWindow(req.query.startTime, req.query.endTime) : undefined;
  success(res, await slotModel.listByLocation(locationId, { window, vehicleType: req.query.vehicleType }));
});

const createSlot = asyncHandler(async (req, res) => {
  const locationId = toId(req.params.locationId, 'Location ID');
  if (!(await locationModel.findById(locationId))) throw notFound('Parking location not found.');

  const { slotNumber, slotType, status } = req.body;
  if ((await slotModel.findNumbers(locationId, [slotNumber])).length) {
    throw conflict(`Slot ${slotNumber} already exists at this location.`);
  }
  created(res, await slotModel.create({ locationId, slotNumber, slotType, status: status || 'AVAILABLE' }), 'Parking slot created.');
});

/** Create A01..A10 style slots in one go. */
const createSlotsBulk = asyncHandler(async (req, res) => {
  const locationId = toId(req.params.locationId, 'Location ID');
  if (!(await locationModel.findById(locationId))) throw notFound('Parking location not found.');

  const prefix = (req.body.prefix || '').toUpperCase();
  const startNumber = Number(req.body.startNumber || 1);
  const count = Number(req.body.count);
  const width = Math.max(2, String(startNumber + count - 1).length);

  const slots = Array.from({ length: count }, (_, index) => ({
    slotNumber: `${prefix}${String(startNumber + index).padStart(width, '0')}`,
    slotType: req.body.slotType,
  }));
  if (slots.some((slot) => slot.slotNumber.length > 20)) throw unprocessable('Generated slot numbers are longer than 20 characters.');

  const existing = await slotModel.findNumbers(locationId, slots.map((slot) => slot.slotNumber));
  if (existing.length) {
    const shown = existing.slice(0, 5).join(', ');
    throw conflict(`These slot numbers already exist at this location: ${shown}${existing.length > 5 ? ', ...' : ''}.`);
  }

  await slotModel.createMany(locationId, slots);
  created(
    res,
    { created: count, firstSlot: slots[0].slotNumber, lastSlot: slots[slots.length - 1].slotNumber },
    `${count} parking slots created.`,
  );
});

const updateSlot = asyncHandler(async (req, res) => {
  const slotId = toId(req.params.id, 'Slot ID');
  const slot = await slotModel.findById(slotId);
  if (!slot) throw notFound('Parking slot not found.');

  const { slotNumber, slotType } = req.body;
  if (slotNumber !== slot.slotNumber && (await slotModel.findNumbers(slot.locationId, [slotNumber])).length) {
    throw conflict(`Slot ${slotNumber} already exists at this location.`);
  }
  success(res, await slotModel.update(slotId, { slotNumber, slotType }), 200, 'Parking slot updated.');
});

const updateSlotStatus = asyncHandler(async (req, res) => {
  const slotId = toId(req.params.id, 'Slot ID');
  if (!(await slotModel.findById(slotId))) throw notFound('Parking slot not found.');
  success(res, await slotModel.updateStatus(slotId, req.body.status), 200, 'Slot status updated.');
});

const deleteSlot = asyncHandler(async (req, res) => {
  const slotId = toId(req.params.id, 'Slot ID');
  try {
    if (!(await slotModel.remove(slotId))) throw notFound('Parking slot not found.');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw conflict('This slot has reservations, so it cannot be deleted. Set it to maintenance instead.');
    }
    throw error;
  }
  success(res, null, 200, 'Parking slot deleted.');
});

// ------------------------------------------------------ availability & quote

/** GET /api/availability?locationId=&startTime=&endTime=[&vehicleType=] */
const getAvailability = asyncHandler(async (req, res) => {
  const locationId = toId(req.query.locationId, 'Location ID');
  const window = parseWindow(req.query.startTime, req.query.endTime);
  await requireVisibleLocation(req, locationId);

  const slots = await slotModel.listAvailable(locationId, window, req.query.vehicleType);
  success(res, {
    locationId,
    startTime: sqlToIso(toSqlDateTime(window.start)),
    endTime: sqlToIso(toSqlDateTime(window.end)),
    availableSlots: slots.map(({ slotId, slotNumber, slotType }) => ({ slotId, slotNumber, slotType })),
  });
});

/** GET /api/locations/:id/quote?vehicleType=&startTime=&endTime= */
const getQuote = asyncHandler(async (req, res) => {
  const quote = await reservationService.getQuote({
    locationId: toId(req.params.id, 'Location ID'),
    vehicleType: req.query.vehicleType,
    startTime: req.query.startTime,
    endTime: req.query.endTime,
  });
  success(res, quote);
});

module.exports = {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  listSlots,
  createSlot,
  createSlotsBulk,
  updateSlot,
  updateSlotStatus,
  deleteSlot,
  getAvailability,
  getQuote,
};
