const feeModel = require('../models/feeModel');
const locationModel = require('../models/locationModel');
const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const { toId } = require('../utils/ids');
const { parseDateTime, toSqlDateTime } = require('../utils/dateTime');
const { isMissing } = require('../validators/helpers');
const { notFound, unprocessable } = require('../utils/errors');

/** Convert the request body (or merge with the existing fee) into database values. */
function toFeeValues(body, existing) {
  const from = !isMissing(body.effectiveFrom)
    ? parseDateTime(body.effectiveFrom)
    : existing
      ? parseDateTime(existing.effectiveFrom)
      : new Date();
  const to = !isMissing(body.effectiveTo) ? parseDateTime(body.effectiveTo) : null;

  if (to && to <= from) throw unprocessable('Effective to must be after effective from.');

  return {
    locationId: Number(body.locationId),
    vehicleType: body.vehicleType,
    hourlyRate: Number(body.hourlyRate),
    dailyRate: isMissing(body.dailyRate) ? null : Number(body.dailyRate),
    effectiveFrom: toSqlDateTime(from),
    effectiveTo: to ? toSqlDateTime(to) : null,
    status: body.status || existing?.status || 'ACTIVE',
  };
}

async function requireLocation(locationId) {
  if (!(await locationModel.findById(locationId))) throw notFound('Parking location not found.');
}

const listFees = asyncHandler(async (req, res) => {
  const locationId = req.query.locationId ? toId(req.query.locationId, 'Location ID') : undefined;
  success(res, await feeModel.list({ locationId }));
});

const createFee = asyncHandler(async (req, res) => {
  const values = toFeeValues(req.body);
  await requireLocation(values.locationId);
  created(res, await feeModel.create(values), 'Parking fee created.');
});

const updateFee = asyncHandler(async (req, res) => {
  const feeId = toId(req.params.id, 'Fee ID');
  const existing = await feeModel.findById(feeId);
  if (!existing) throw notFound('Parking fee not found.');

  const values = toFeeValues(req.body, existing);
  await requireLocation(values.locationId);
  success(res, await feeModel.update(feeId, values), 200, 'Parking fee updated.');
});

const deleteFee = asyncHandler(async (req, res) => {
  if (!(await feeModel.remove(toId(req.params.id, 'Fee ID')))) throw notFound('Parking fee not found.');
  success(res, null, 200, 'Parking fee deleted.');
});

module.exports = { listFees, createFee, updateFee, deleteFee };
