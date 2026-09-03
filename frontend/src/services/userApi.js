import api from './api';

export const userApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (payload) => api.post('/users', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  resetPassword: (id, newPassword) =>
    api.patch(`/users/${id}/password`, { newPassword }).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}`).then((r) => r.data),
  changeMyPassword: (currentPassword, newPassword) =>
    api
      .post('/auth/change-password', { currentPassword, newPassword })
      .then((r) => r.data),
};
