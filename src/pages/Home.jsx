import React, { useEffect, useMemo, useState } from 'react';
import { useModels } from '../context/ModelsContext';
import ModelCard from '../components/ModelCard';
import CategoryPicker from '../components/CategoryPicker';
import { useGLTF } from '@react-three/drei';

export default function Home() {
  const { models, loading: modelsLoading } = useModels();
  const [selectedCat, setSelectedCat] = useState('All');
  // Meta tags for Home
  useEffect(() => {
    const title = 'Discover — Blockprint';
    const desc = 'Explore and preview Minecraft builds in 3D on Blockprint.';
    const url = typeof window !== 'undefined' ? window.location.href : undefined;
    document.title = title;
    setNamedMeta('description', desc);
    setNamedMeta('theme-color', '#3b82f6');
    setOG('og:title', title); setOG('og:description', desc); setOG('og:site_name', 'Blockprint'); setOG('og:type', 'website'); if (url) setOG('og:url', url);
    setTwitter('twitter:card', 'summary'); setTwitter('twitter:title', title); setTwitter('twitter:description', desc);
  }, []);
  function setNamedMeta(name, content) { if (!content) return; let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  function setOG(property, content) { if (!content) return; let el = document.querySelector(`meta[property="${property}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  function setTwitter(name, content) { if (!content) return; let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); } el.setAttribute('content', String(content)); }

  const allCategories = useMemo(() => {
    const set = new Set();
    for (const m of models) {
      if (Array.isArray(m.categories)) {
        for (const c of m.categories) {
          const norm = String(c || '').trim();
          if (norm) set.add(norm);
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [models]);

  const filtered = useMemo(() => {
    if (selectedCat === 'All') return models;
    return models.filter(m => Array.isArray(m.categories) && m.categories.includes(selectedCat));
  }, [models, selectedCat]);

  const onChangeCategory = (value) => {
    // Do not trigger skeleton on category change; just switch filter
    setSelectedCat(value);
  };

  useEffect(() => {
    // Preload all model GLBs for faster viewer load. We don't manage the 'loading' UI here;
    // consumers should use the ModelsContext loading flag to decide whether to show skeletons.
    try {
      models.forEach(m => {
        if (m?.url) useGLTF.preload(m.url);
      });
    } catch (_e) { /* ignore */ }
  }, [models]);

  return (
    <div className="home">
      <div className="home-header">
        <div className="home-left">
          <h1>Discover</h1>
          {allCategories.length > 0 && (
            <div className="home-filter">
              <CategoryPicker categories={allCategories} value={selectedCat} onChange={onChangeCategory} />
            </div>
          )}
        </div>
      </div>

      {modelsLoading ? (
        <div className="grid fade-in" aria-busy="true" aria-live="polite">
          {Array.from({ length: Math.max(filtered.length, 6) }).map((_, i) => (
            <div key={i} className="model-card">
              <div className="model-card-viewer">
                <div className="skeleton skeleton-viewer" aria-hidden="true"></div>
              </div>
              <div className="model-card-info">
                <div className="skeleton skeleton-line" style={{ width: '70%' }} aria-hidden="true"></div>
                <div className="skeleton skeleton-line" style={{ width: '90%', marginTop: 6 }} aria-hidden="true"></div>
              </div>
              <div className="model-card-actions">
                <div className="skeleton skeleton-button" aria-hidden="true"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {models.length === 0 ? (
            <p>No models yet.</p>
          ) : (
            <p>No models match this category.</p>
          )}
        </div>
      ) : (
        <div className="grid fade-in">
          {filtered.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </div>
  );
}
