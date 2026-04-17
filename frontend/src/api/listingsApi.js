import { api } from './axios';

export const getListings = (params) => api.get('/listings', { params });
export const getListingById = (id) => api.get(`/listings/${id}`);
export const createListing = (data) => api.post('/listings', data);
export const updateListing = (id, data) => api.put(`/listings/${id}`, data);
export const deleteListing = (id) => api.delete(`/listings/${id}`);
export const syncListing = (id) => api.post(`/listings/${id}/sync`);
export const reconcileListing = (id) => api.post(`/listings/${id}/reconcile`);
export const getListingLogs = (id) => api.get(`/listings/${id}/logs`);
