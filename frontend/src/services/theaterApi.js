import api from './api';

export const theaterApi = {
  list: () => api.get('/theaters').then((r) => r.data),
  get: (id) => api.get(`/theaters/${id}`).then((r) => r.data),
  create: (payload) => api.post('/theaters', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/theaters/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/theaters/${id}`).then((r) => r.data),
};
