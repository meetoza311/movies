import api from './api';

export const showApi = {
  list: (params) => api.get('/shows', { params }).then((r) => r.data),
  get: (id) => api.get(`/shows/${id}`).then((r) => r.data),
  create: (payload) => api.post('/shows', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/shows/${id}`, payload).then((r) => r.data),
  remove: (id, force = false) =>
    api.delete(`/shows/${id}`, { params: force ? { force: true } : {} }).then((r) => r.data),
  seats: (showId) => api.get(`/shows/${showId}/seats`).then((r) => r.data),
};
