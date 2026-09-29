import { API_URL, TOKEN_KEY } from '../config';

/** Error thrown for every failed request. `errors` holds field-level messages from the server. */
export class ApiError extends Error {
  constructor(message, status = 0, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  /** { fieldName: message } for showing server validation errors next to form fields. */
  get fieldErrors() {
    return Object.fromEntries((this.errors || []).map((item) => [item.field, item.message]));
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => (token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY));

let unauthorizedHandler = null;

/** Called when a signed-in request comes back 401 (expired or invalid token). */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * Send a request to the backend and return the `data` part of the response envelope
 * ({ success, data, message }). Failures throw an ApiError with a readable message.
 */
export async function request(method, path, { params, body, auth = true } = {}) {
  const token = auth ? getToken() : null;

  let response;
  try {
    response = await fetch(`${API_URL}${path}${buildQuery(params)}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the backend is running.', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || (payload && payload.success === false)) {
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    const message = payload?.message || `The request failed (status ${response.status}).`;
    throw new ApiError(message, response.status, payload?.errors || []);
  }

  return payload ? payload.data : null;
}

export const api = {
  get: (path, params, options) => request('GET', path, { params, ...options }),
  post: (path, body, options) => request('POST', path, { body: body ?? {}, ...options }),
  put: (path, body, options) => request('PUT', path, { body: body ?? {}, ...options }),
  patch: (path, body, options) => request('PATCH', path, { body: body ?? {}, ...options }),
  delete: (path, options) => request('DELETE', path, options),
};
