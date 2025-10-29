import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
    return saved || 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try { window.localStorage.setItem('theme', theme); } catch {}
    // Remove any inline background/color applied by the pre-render script in index.html
    // so that theme changes take full effect without requiring a reload.
    try {
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.style) {
        document.documentElement.style.background = '';
        document.documentElement.style.color = '';
      }
    } catch (_) {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const value = useMemo(() => ({ theme, toggle }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
