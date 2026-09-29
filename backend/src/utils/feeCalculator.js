const { billableHours } = require('./dateTime');

/**
 * Pure fee calculation (no database access).
 *
 * - Time is billed in whole hours, rounded up (minimum one hour).
 * - Without a daily rate: hours x hourlyRate.
 * - With a daily rate: every full 24 hours is charged at the daily rate, and the
 *   remaining hours are charged hourly but never more than one extra day.
 */
function calculateFee({ hourlyRate, dailyRate = null }, start, end) {
  const hours = billableHours(start, end);
  const hourly = Number(hourlyRate);
  let total;

  if (dailyRate !== null && dailyRate !== undefined) {
    const daily = Number(dailyRate);
    const days = Math.floor(hours / 24);
    const remainingHours = hours - days * 24;
    total = days * daily + Math.min(remainingHours * hourly, daily);
  } else {
    total = hours * hourly;
  }

  return { billableHours: hours, amount: Math.round(total * 100) / 100 };
}

module.exports = { calculateFee };
