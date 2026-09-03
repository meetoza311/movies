import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinedesk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : error.message === 'Network Error'
          ? 'API unavailable. Check your connection and backend server.'
          : 'Something went wrong');

    if (status === 401) {
      localStorage.removeItem('cinedesk_token');
      localStorage.removeItem('cinedesk_admin');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const enriched = new Error(message);
    enriched.status = status;
    enriched.errorCode = error.response?.data?.errorCode;
    enriched.data = error.response?.data;
    return Promise.reject(enriched);
  }
);

export default api;
