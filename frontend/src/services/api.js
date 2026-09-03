import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://movies-pnmw.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  // Free Render cold start can take 45–90s
  timeout: 90_000,
});

const RETRYABLE = new Set(['ECONNABORTED', 'ERR_NETWORK', 'ECONNRESET']);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinedesk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.__retryCount = config.__retryCount || 0;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const code = error.code;
    const canRetry =
      config &&
      !config.__noRetry &&
      config.__retryCount < 2 &&
      (RETRYABLE.has(code) || status === 502 || status === 503 || status === 504);

    if (canRetry) {
      config.__retryCount += 1;
      const waitMs = 1500 * config.__retryCount;
      await new Promise((r) => setTimeout(r, waitMs));
      return api(config);
    }

    const message =
      error.response?.data?.message ||
      (code === 'ECONNABORTED'
        ? 'Server is waking up (free hosting). Please wait and try again.'
        : error.message === 'Network Error' || code === 'ERR_NETWORK'
          ? 'API is starting up. Wait a few seconds and retry.'
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

let warmupStarted = false;

/** Hit health to wake Render free tier; keep pinging while tab is open. */
export function startApiWarmup() {
  if (warmupStarted) return () => {};
  warmupStarted = true;

  const healthUrl = `${API_BASE.replace(/\/$/, '')}/health`;

  const ping = () =>
    fetch(healthUrl, { method: 'GET', cache: 'no-store', mode: 'cors' }).catch(
      () => null
    );

  ping();
  setTimeout(ping, 2500);
  const id = setInterval(ping, 10 * 60 * 1000);

  const onFocus = () => ping();
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ping();
  });

  return () => clearInterval(id);
}

export default api;
