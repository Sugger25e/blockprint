import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use explicit API base if provided. If not set, default to:
  // - in production: '' (relative path so frontend talks to same origin via /api)
  // - in development: 'http://localhost:4000' to hit the local backend
  const API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
  const res = await fetch(`${API_BASE}/api/auth/session`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
  if (!cancelled) setUser(data?.user || null);
      } catch (_) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API_BASE]);

  const login = () => {
    window.location.href = `${API_BASE}/api/auth/discord`;
  };

  const logout = async () => {
    try {
  const base = API_BASE || '';
  await fetch(`${base}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (_) {}
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
