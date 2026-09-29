import { api } from './apiClient';

export const login = (email, password) => api.post('/auth/login', { email, password }, { auth: false });

export const register = ({ fullName, email, phone, password }) =>
  api.post('/auth/register', { fullName, email, phone: phone || undefined, password }, { auth: false });

export const getProfile = () => api.get('/users/me');

export const updateProfile = ({ fullName, phone, currentPassword, newPassword }) =>
  api.put('/users/me', {
    fullName,
    phone: phone || '',
    ...(newPassword && { currentPassword, newPassword }),
  });
