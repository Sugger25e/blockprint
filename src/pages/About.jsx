import React, { useEffect } from 'react';

export default function About() {
  useEffect(() => {
    const title = 'About — Blockfolio';
    const desc = 'Learn about Blockfolio, a showcase of interactive 3D Minecraft builds.';
    const url = typeof window !== 'undefined' ? window.location.href : undefined;
    document.title = title;
    setNamedMeta('description', desc);
    setNamedMeta('theme-color', '#3b82f6');
    setOG('og:title', title); setOG('og:description', desc); setOG('og:site_name', 'Blockfolio'); setOG('og:type', 'website'); if (url) setOG('og:url', url);
    setTwitter('twitter:card', 'summary'); setTwitter('twitter:title', title); setTwitter('twitter:description', desc);
  }, []);
  function setNamedMeta(name, content) { if (!content) return; let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  function setOG(property, content) { if (!content) return; let el = document.querySelector(`meta[property="${property}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  function setTwitter(name, content) { if (!content) return; let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  return (
    <div className="page">
      <h2>About Blockfolio</h2>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>What is this?</strong></div>
        <p>
          Blockfolio is a curated showcase of Minecraft builds with interactive 3D previews (.glb) you can rotate and zoom in your browser.
          Each build has its own detail page, categories, materials list, creator credits, and a downloadable Holoprint pack to help you recreate it in-game.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>How it works (public)</strong></div>
        <ul>
          <li>Discover page lists published builds only (drafts are hidden).</li>
          <li>Click a card for a full detail view with an ambient-lit 3D viewer and remembered camera/zoom per model.</li>
          <li>Filter by categories, view materials (with icons where available), and download the Holoprint (.mcpack) when provided.</li>
          <li>Dynamic meta tags are set per page for better sharing (Open Graph/Twitter).</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>How it works (uploads & admin)</strong></div>
        <ul>
          <li>Public Upload accepts .glb and .mcstructure, with optional credits and socials.</li>
          <li>Admin reviews submissions and can approve them into Drafts.</li>
          <li>In Drafts, admin can verify files, upload a Holoprint pack (.mcpack), and mark a build Ready (publish).</li>
          <li>Only Ready builds appear on the public Discover grid. Admin can also remove builds.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>Tech highlights</strong></div>
        <ul>
          <li>React with React Router for pages; Three.js via @react-three/fiber and drei for the viewer.</li>
          <li>Contexts for theme, models (API + manifest fallback), and per-model viewer state.</li>
          <li>Express + MongoDB backend for submissions, approvals, drafts → publish, and file serving.</li>
          <li>SEO-ish dynamic meta tags set directly in the DOM (no extra library).</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>Credits</strong></div>
        <ul>
          <li>
            Holoprint tool: <a href="https://holoprint-mc.github.io/" target="_blank" rel="noreferrer">holoprint-mc.github.io</a> — Author: <strong>SuperLlama88888</strong>
          </li>
          <li>
            Website owner: <strong>Sugger</strong>
          </li>
        </ul>
      </section>
    </div>
  );
}
