import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use explicit API base if provided; otherwise:
  // - In local dev, default to localhost:4000
  // - In production, default to relative base ('') so requests go to /api on the same origin
  const API_BASE = process.env.REACT_APP_API_BASE;

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
