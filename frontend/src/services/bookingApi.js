import api from './api';

export const bookingApi = {
  list: (params) => api.get('/bookings', { params }).then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  create: (payload) => api.post('/bookings', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/bookings/${id}`, payload).then((r) => r.data),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`).then((r) => r.data),
  remove: (id) => api.delete(`/bookings/${id}`).then((r) => r.data),
  gateList: (showId) => api.get(`/bookings/gate/show/${showId}`).then((r) => r.data),
  gateLookup: (payload) => api.post('/bookings/gate/lookup', payload).then((r) => r.data),
  gateCheckIn: (payload) => api.post('/bookings/gate/check-in', payload).then((r) => r.data),
  sendEmail: (id) => api.post(`/bookings/${id}/send-email`).then((r) => r.data),
};
