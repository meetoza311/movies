import api from './api';

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
};
