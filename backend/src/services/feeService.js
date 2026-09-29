const feeModel = require('../models/feeModel');
const { calculateFee } = require('../utils/feeCalculator');
const { toSqlDateTime } = require('../utils/dateTime');
const { unprocessable } = require('../utils/errors');

/** The active fee for a location + vehicle type at the start of the booking; 422 when none is configured. */
async function getApplicableFee(locationId, vehicleType, start, connection) {
  const fee = await feeModel.findApplicable(locationId, vehicleType, toSqlDateTime(start), connection);
  if (!fee) {
    throw unprocessable(`No parking fee is configured for ${vehicleType.toLowerCase()} vehicles at this location.`);
  }
  return fee;
}

/** Fee lookup plus calculation for a period. */
async function priceReservation(locationId, vehicleType, start, end, connection) {
  const fee = await getApplicableFee(locationId, vehicleType, start, connection);
  const { billableHours, amount } = calculateFee(fee, start, end);
  return { fee, billableHours, amount };
}

module.exports = { getApplicableFee, priceReservation, calculateFee };
