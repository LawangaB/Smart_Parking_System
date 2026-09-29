/**
 * Client-side checks that mirror the backend rules so people get instant feedback.
 * The server validates again and stays authoritative.
 * Each function returns an error message, or '' when the value is fine.
 */
import { VEHICLE_TYPES } from './constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;
const REGISTRATION_PATTERN = /^[A-Z0-9][A-Z0-9 -]{2,29}$/;

export const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

export function required(value, label) {
  return isBlank(value) ? `${label} is required.` : '';
}

export function fullName(value) {
  if (isBlank(value)) return 'Full name is required.';
  const trimmed = value.trim();
  if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
  if (trimmed.length > 100) return 'Full name must be at most 100 characters.';
  return '';
}

export function email(value) {
  if (isBlank(value)) return 'Email is required.';
  if (!EMAIL_PATTERN.test(value.trim())) return 'Enter a valid email address, such as name@example.com.';
  return '';
}

export function phone(value, { requiredField = false } = {}) {
  if (isBlank(value)) return requiredField ? 'Phone number is required.' : '';
  if (!PHONE_PATTERN.test(value.trim())) return 'Use 7 to 20 digits, spaces, + ( ) or -.';
  return '';
}

/** 8-72 characters with at least one letter and one number (same as the backend). */
export function password(value, label = 'Password') {
  if (isBlank(value)) return `${label} is required.`;
  if (value.length < 8 || value.length > 72) return `${label} must be 8 to 72 characters.`;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return `${label} needs at least one letter and one number.`;
  return '';
}

export function confirmPassword(value, original) {
  if (isBlank(value)) return 'Confirm your password.';
  if (value !== original) return 'The passwords do not match.';
  return '';
}

export function registrationNumber(value) {
  if (isBlank(value)) return 'Registration number is required.';
  if (!REGISTRATION_PATTERN.test(value.trim().toUpperCase())) {
    return 'Use 3 to 30 letters, numbers, spaces or hyphens.';
  }
  return '';
}

export function vehicleType(value) {
  if (isBlank(value)) return 'Choose a vehicle type.';
  if (!VEHICLE_TYPES.includes(value)) return 'Choose one of the listed vehicle types.';
  return '';
}

export function money(value, label, { requiredField = true } = {}) {
  if (isBlank(value)) return requiredField ? `${label} is required.` : '';
  const number = Number(value);
  if (!Number.isFinite(number)) return `${label} must be a number.`;
  if (number < 0) return `${label} cannot be negative.`;
  if (Math.round(number * 100) !== Number((number * 100).toFixed(6))) return `${label} can have at most 2 decimal places.`;
  return '';
}

/** Run several checks and keep only the fields that failed: { field: message }. */
export function collectErrors(checks) {
  return Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
}
