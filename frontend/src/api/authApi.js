import { api } from './axios';

export const getMe = () => api.get('/auth/me');

export const getLoginUrl = () =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`;

export const logoutMercadoLivre = () => api.post('/auth/logout');
