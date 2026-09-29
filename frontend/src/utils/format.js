import { CURRENCY } from '../config';
import { VEHICLE_TYPE_LABELS } from './constants';

let moneyFormat;
function getMoneyFormat() {
  if (!moneyFormat) {
    try {
      moneyFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY });
    } catch {
      moneyFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
  return moneyFormat;
}

export function formatMoney(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '-';
  return getMoneyFormat().format(Number(amount));
}

export const vehicleTypeLabel = (type) => VEHICLE_TYPE_LABELS[type] || type || '';

export const firstName = (fullName = '') => fullName.trim().split(/\s+/)[0] || '';

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Group letters of a slot number: "A07" -> "A". Used to gather bays into banks on the plan. */
export const slotPrefix = (slotNumber = '') => slotNumber.replace(/[\d\s-]*$/, '') || '#';
