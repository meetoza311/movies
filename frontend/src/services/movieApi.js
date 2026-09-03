import api from './api';

export const movieApi = {
  list: (params) => api.get('/movies', { params }).then((r) => r.data),
  get: (id) => api.get(`/movies/${id}`).then((r) => r.data),
  create: (payload) => api.post('/movies', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/movies/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/movies/${id}`).then((r) => r.data),
  dependencies: (id) => api.get(`/movies/${id}/dependencies`).then((r) => r.data),
};
