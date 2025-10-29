import React, { useEffect, useMemo, useState } from 'react';
import { useModels } from '../context/ModelsContext';
import ModelCard from '../components/ModelCard';
import CategoryPicker from '../components/CategoryPicker';
import { useGLTF } from '@react-three/drei';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export default function Home() {
  const { models, loading: modelsLoading } = useModels();
  const [selectedCat, setSelectedCat] = useState('All');
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  // Pagination
  const PER_PAGE = 8;
  const paramCategory = params.category || null;
  const paramPage = Number(params.page || 1) || 1;
  const [page, setPage] = useState(paramPage);
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
    // navigate to first page of this category
    const encoded = encodeURIComponent(value === 'All' ? 'all' : value.toLowerCase());
    // always update route when selecting a category (per requirement)
    navigate(`/${encoded}/1`);
  };

  useEffect(() => {
    // Preload GLB urls for a smoother viewer experience.
    try {
      models.forEach(m => {
        if (m?.url) useGLTF.preload(m.url);
      });
    } catch (_e) { /* ignore */ }
  }, [models]);

  // Sync selected category & page from URL params when route changes
  useEffect(() => {
    // If params contain a category and page, apply them
    if (paramCategory) {
      const cat = paramCategory === 'all'
        ? 'All'
        : (allCategories.find(c => String(c).toLowerCase() === paramCategory) || decodeURIComponent(paramCategory));
      setSelectedCat(cat);
    }
    // If page param exists, use it; otherwise keep page 1 (don't rewrite '/')
    setPage(paramPage);
  }, [paramCategory, paramPage, allCategories]);

  // pagination derived values
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(Math.max(1, page || 1), pages);
  const startIndex = total === 0 ? 0 : (current - 1) * PER_PAGE + 1;
  const endIndex = Math.min(total, current * PER_PAGE);

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
        <>
        <div className="grid fade-in">
          {(() => {
            // compute pagination
            const total = filtered.length;
            const pages = Math.max(1, Math.ceil(total / PER_PAGE));
            // clamp page
            const current = Math.min(Math.max(1, page || 1), pages);
            const start = (current - 1) * PER_PAGE;
            const pageItems = filtered.slice(start, start + PER_PAGE);
            return pageItems.map((m) => (
              <ModelCard key={m.id} model={m} />
            ));
          })()}
        </div>

        {/* Pagination controls (always shown) */}
        <div className="pager" style={{ justifyContent: 'center', marginTop: 18 }}>
          {(() => {
            const items = [];

            // Prev button (hidden on first page)
            if (current > 1) {
              items.push(
                <button key="prev" className="btn" onClick={() => {
                  const nextP = current - 1;
                  setPage(nextP);
                  const shouldNavigate = !(location.pathname === '/' && nextP === 1);
                  if (shouldNavigate) {
                    const catPath = (selectedCat === 'All') ? 'all' : encodeURIComponent(selectedCat.toLowerCase());
                    navigate(`/${catPath}/${nextP}`);
                  }
                }}>Prev</button>
              );
            }

            for (let p = 1; p <= pages; p++) {
              const isActive = p === current;
              items.push(
                <button
                  key={p}
                  onClick={() => {
                    setPage(p);
                    // If currently at root '/', do not change route for page 1; otherwise navigate
                    const shouldNavigate = !(location.pathname === '/' && p === 1);
                    if (shouldNavigate) {
                      const catPath = (selectedCat === 'All') ? 'all' : encodeURIComponent(selectedCat.toLowerCase());
                      navigate(`/${catPath}/${p}`);
                    }
                  }}
                  aria-current={isActive || undefined}
                  className={`btn ${isActive ? 'pager-active' : ''}`}
                >
                  {p}
                </button>
              );
            }

            // Next button (hidden on last page)
            if (current < pages) {
              items.push(
                <button key="next" className="btn" onClick={() => {
                  const nextP = current + 1;
                  setPage(nextP);
                  const shouldNavigate = !(location.pathname === '/' && nextP === 1);
                  if (shouldNavigate) {
                    const catPath = (selectedCat === 'All') ? 'all' : encodeURIComponent(selectedCat.toLowerCase());
                    navigate(`/${catPath}/${nextP}`);
                  }
                }}>Next</button>
              );
            }

            return <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{items}</div>;
          })()}
        </div>

        {/* Summary below the pager */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="pager-summary" style={{ marginTop: 8 }}>
            {`Showing ${startIndex}–${endIndex} of ${total} ${total === 1 ? 'build' : 'builds'}`}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
