import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cinedesk_admin') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('cinedesk_token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('cinedesk_token')));

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await authApi.me();
        if (!cancelled) {
          setAdmin(res.data);
          localStorage.setItem('cinedesk_admin', JSON.stringify(res.data));
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem('cinedesk_token');
          localStorage.removeItem('cinedesk_admin');
          setToken(null);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      admin,
      token,
      loading,
      isAuthenticated: Boolean(token && admin),
      async login(email, password) {
        const res = await authApi.login({ email, password });
        localStorage.setItem('cinedesk_token', res.data.token);
        localStorage.setItem('cinedesk_admin', JSON.stringify(res.data.admin));
        setToken(res.data.token);
        setAdmin(res.data.admin);
        return res.data;
      },
      async logout() {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        localStorage.removeItem('cinedesk_token');
        localStorage.removeItem('cinedesk_admin');
        setToken(null);
        setAdmin(null);
      },
    }),
    [admin, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
