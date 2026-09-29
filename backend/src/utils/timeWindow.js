const { parseDateTime } = require('./dateTime');
const { unprocessable } = require('./errors');
const { RESERVATION_RULES } = require('./constants');

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Parse and validate a start/end pair.
 * - requireFuture: reject windows that started in the past (bookings).
 * - enforceLimits: apply the maximum duration / advance-booking rules (bookings).
 */
function parseWindow(startRaw, endRaw, options = {}) {
  const { requireFuture = false, enforceLimits = false, now = new Date() } = options;

  const start = parseDateTime(startRaw);
  const end = parseDateTime(endRaw);

  if (!start) throw unprocessable('Start time is not a valid date and time.');
  if (!end) throw unprocessable('End time is not a valid date and time.');
  if (end <= start) throw unprocessable('End time must be after the start time.');

  if (requireFuture) {
    const earliest = now.getTime() - RESERVATION_RULES.START_GRACE_MINUTES * 60_000;
    if (start.getTime() < earliest) throw unprocessable('Start time cannot be in the past.');
  }

  if (enforceLimits) {
    if ((end - start) / HOUR_MS > RESERVATION_RULES.MAX_DURATION_HOURS) {
      throw unprocessable(
        `A reservation cannot be longer than ${RESERVATION_RULES.MAX_DURATION_HOURS / 24} days.`,
      );
    }
    if (start.getTime() - now.getTime() > RESERVATION_RULES.MAX_ADVANCE_DAYS * DAY_MS) {
      throw unprocessable(
        `Reservations can be made at most ${RESERVATION_RULES.MAX_ADVANCE_DAYS} days in advance.`,
      );
    }
  }

  return { start, end };
}

module.exports = { parseWindow };
