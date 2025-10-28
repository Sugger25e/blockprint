import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ModelsContext = createContext(null);

export function ModelsProvider({ children }) {
  const [models, setModels] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/builds`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data?.models) ? data.models : [];
          if (!cancelled) {
            const normalized = arr.map((m, idx) => ({
              id: Number.isFinite(Number(m.id)) ? Number(m.id) : (idx + 1),
              name: m.name || `Model ${idx + 1}`,
              description: m.description || '',
              materials: Array.isArray(m.materials) ? m.materials : [],
              categories: Array.isArray(m.categories) ? m.categories.filter(Boolean) : [],
              // Ensure holoprint URL is absolute to avoid SPA routing to a blank page
              holoprintUrl: m.holoprintUrl ? (m.holoprintUrl.startsWith('http') ? m.holoprintUrl : `${API_BASE}${m.holoprintUrl}`) : null,
              credits: m.credits || null,
              url: m.url?.startsWith('http') ? m.url : `${API_BASE}${m.url || ''}`,
              sourceType: 'api',
              details: m.details || {},
              buildId: m.buildId || null,
              publishedAt: m.publishedAt || null,
              previewImage: m.previewImage ? (m.previewImage.startsWith('http') ? m.previewImage : `${API_BASE}${m.previewImage}`) : null,
            })).filter(m => !!m.url);
            setModels(normalized);
            return;
          }
        }
      } catch (_e) {
        // ignore
      }
      // Fallback to legacy manifest.json if API not available
      try {
        const res2 = await fetch(process.env.PUBLIC_URL + '/models/manifest.json', { cache: 'no-store' });
        if (!res2.ok) return;
        const data2 = await res2.json();
        if (!Array.isArray(data2?.models)) return;
        if (cancelled) return;
        const staticModels = data2.models.map((m, idx) => {
          const parsedId = typeof m.id === 'number' ? m.id : Number(m.id);
          const id = Number.isFinite(parsedId) ? parsedId : (idx + 1);
          return {
            id,
            name: m.name || `Model ${idx + 1}`,
            description: m.description || '',
            materials: Array.isArray(m.materials) ? m.materials : [],
            categories: Array.isArray(m.categories) ? m.categories.filter(Boolean) : [],
            holoprintUrl: m.holoprintUrl || null,
            credits: m.credits || null,
            url: (m.url?.startsWith('http') ? m.url : (process.env.PUBLIC_URL + '/' + (m.url || ''))),
            sourceType: 'static',
            details: m.details || {},
          };
        }).filter(m => !!m.url);
        setModels(staticModels);
      } catch (_) {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ models }), [models]);
  return (
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
  );
}

export function useModels() {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error('useModels must be used within ModelsProvider');
  return ctx;
}
