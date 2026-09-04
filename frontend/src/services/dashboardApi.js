import api from './api';

export const dashboardApi = {
  stats: (params = {}) =>
    api
      .get('/dashboard/stats', {
        params: {
          movieId: params.movieId || undefined,
          showId: params.showId || undefined,
          status: params.status || undefined,
        },
      })
      .then((r) => r.data),
};
