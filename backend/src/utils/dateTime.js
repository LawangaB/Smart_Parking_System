/**
 * Date/time helpers. The API exchanges naive local timestamps such as
 * "2026-10-01T10:00:00" (see api.md) and MySQL stores them as DATETIME.
 */
const ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

const pad = (n) => String(n).padStart(2, '0');

/**
 * Parse "YYYY-MM-DDTHH:mm[:ss]" (or with a space instead of T). Strings without an
 * explicit offset are interpreted as server-local time. Returns a Date or null.
 */
function parseDateTime(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;

  const match = ISO_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, y, mo, d, h, mi, s = '0', offset] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${pad(second)}${offset || ''}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date -> "YYYY-MM-DD HH:mm:ss" (server-local wall-clock time) for MySQL DATETIME. */
function toSqlDateTime(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** MySQL DATETIME string -> "YYYY-MM-DDTHH:mm:ss" used in API responses. */
function sqlToIso(value) {
  if (value === null || value === undefined) return null;
  return String(value).replace(' ', 'T');
}

/** Whole hours billed for a period; anything started is rounded up, minimum 1 hour. */
function billableHours(start, end) {
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  return Math.max(1, Math.ceil(hours));
}

module.exports = { parseDateTime, toSqlDateTime, sqlToIso, billableHours };
