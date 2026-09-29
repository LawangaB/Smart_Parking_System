/**
 * The API exchanges "naive" local timestamps such as 2026-10-01T10:00:00.
 * JavaScript parses date-time strings without an offset as local time, so the
 * Date objects below stay in the browser's local time zone throughout.
 */
import { RESERVATION_RULES } from './constants';

const pad = (n) => String(n).padStart(2, '0');

export const toDateInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const toTimeInput = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** "2026-10-01" + "10:30" -> "2026-10-01T10:30:00" (or null when either part is empty). */
export function combineDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  return `${dateValue}T${timeValue.length === 5 ? `${timeValue}:00` : timeValue}`;
}

export function parseApiDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Start of the next full hour, e.g. 14:20 -> 15:00. */
export function nextFullHour(from = new Date()) {
  const date = new Date(from.getTime());
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

/** A sensible default booking window: the next full hour, for two hours. */
export function defaultWindow(from = new Date()) {
  const start = nextFullHour(from);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  return {
    arriveDate: toDateInput(start),
    arriveTime: toTimeInput(start),
    leaveDate: toDateInput(end),
    leaveTime: toTimeInput(end),
  };
}

/**
 * Validate the four form fields. Returns { start, end, startIso, endIso, error }.
 * `error` is a message written for the person filling in the form, or null.
 */
export function resolveWindow({ arriveDate, arriveTime, leaveDate, leaveTime }, now = new Date()) {
  const startIso = combineDateTime(arriveDate, arriveTime);
  const endIso = combineDateTime(leaveDate, leaveTime);
  const result = { start: null, end: null, startIso, endIso, error: null };

  if (!startIso || !endIso) {
    result.error = 'Choose when you arrive and when you leave.';
    return result;
  }
  const start = parseApiDate(startIso);
  const end = parseApiDate(endIso);
  if (!start || !end) {
    result.error = 'Enter a valid date and time.';
    return result;
  }
  Object.assign(result, { start, end });

  if (end <= start) {
    result.error = 'Leaving time must be after arrival.';
  } else if (start.getTime() < now.getTime() - RESERVATION_RULES.START_GRACE_MINUTES * 60_000) {
    result.error = 'Arrival time has already passed. Choose a later time.';
  } else if ((end - start) / 3_600_000 > RESERVATION_RULES.MAX_DURATION_HOURS) {
    result.error = `A reservation can last at most ${RESERVATION_RULES.MAX_DURATION_HOURS / 24} days.`;
  } else if ((start - now) / 86_400_000 > RESERVATION_RULES.MAX_ADVANCE_DAYS) {
    result.error = `You can reserve at most ${RESERVATION_RULES.MAX_ADVANCE_DAYS} days ahead.`;
  }
  return result;
}

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
const yearFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric' });

export function formatDay(value) {
  const date = value instanceof Date ? value : parseApiDate(value);
  return date ? dayFormat.format(date) : '';
}

export function formatTime(value) {
  const date = value instanceof Date ? value : parseApiDate(value);
  return date ? timeFormat.format(date) : '';
}

/** "Fri 25 Sep, 10:00" (the year is added when it is not the current one). */
export function formatDateTime(value) {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  const year = date.getFullYear() === new Date().getFullYear() ? '' : ` ${yearFormat.format(date)}`;
  return `${dayFormat.format(date)}${year}, ${timeFormat.format(date)}`;
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Fri 25 Sep, 10:00 to 13:00" or "Fri 25 Sep, 22:00 to Sat 26 Sep, 01:00". */
export function formatRange(startValue, endValue) {
  const start = startValue instanceof Date ? startValue : parseApiDate(startValue);
  const end = endValue instanceof Date ? endValue : parseApiDate(endValue);
  if (!start || !end) return '';
  if (sameDay(start, end)) return `${formatDateTime(start)} to ${formatTime(end)}`;
  return `${formatDateTime(start)} to ${formatDateTime(end)}`;
}

/** "3 hours", "1 day 2 hours". Partial hours are rounded up, like the fee. */
export function formatDuration(startValue, endValue) {
  const start = startValue instanceof Date ? startValue : parseApiDate(startValue);
  const end = endValue instanceof Date ? endValue : parseApiDate(endValue);
  if (!start || !end || end <= start) return '';
  const hours = Math.max(1, Math.ceil((end - start) / 3_600_000));
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  const unit = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (days === 0) return unit(hours, 'hour');
  return rest ? `${unit(days, 'day')} ${unit(rest, 'hour')}` : unit(days, 'day');
}

export function isFuture(value, now = new Date()) {
  const date = parseApiDate(value);
  return Boolean(date && date > now);
}

/**
 * Apply a change to the arrival fields and move the leaving time along with it, keeping the
 * same length of stay (two hours when there was none), so picking a later day never leaves
 * the form with "leave before arrival".
 */
export function withArrivalChange(draft, changes) {
  const next = { ...draft, ...changes };
  const oldStart = parseApiDate(combineDateTime(draft.arriveDate, draft.arriveTime));
  const oldEnd = parseApiDate(combineDateTime(draft.leaveDate, draft.leaveTime));
  const newStart = parseApiDate(combineDateTime(next.arriveDate, next.arriveTime));
  if (!newStart) return next;

  const stay = oldStart && oldEnd && oldEnd > oldStart ? oldEnd - oldStart : 2 * 3_600_000;
  const newEnd = new Date(newStart.getTime() + stay);
  return { ...next, leaveDate: toDateInput(newEnd), leaveTime: toTimeInput(newEnd) };
}
