import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Upload() {
  const { user, loading, login } = useAuth();
  // Meta tags for Upload page
  useEffect(() => {
    const title = 'Upload a Build — Blockprint';
    const desc = 'Submit your Minecraft build for review and publishing on Blockprint.';
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [categories, setCategories] = useState([]);
  const [catInput, setCatInput] = useState('');
  // Credits are derived from your Discord account on the server
  const [glbFile, setGlbFile] = useState(null);
  const [mcstructureFile, setMcstructureFile] = useState(null);
  const [materialsPreview, setMaterialsPreview] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const [aliases, setAliases] = useState({});
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Anti-duplicate submit: lock while request is in-flight and keep a short cooldown after
  const submitLock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const addCategory = () => {
    const val = catInput.trim();
    if (!val) return;
    if (!categories.includes(val)) setCategories([...categories, val]);
    setCatInput('');
  };
  const removeCategory = (idx) => setCategories(categories.filter((_, i) => i !== idx));

  // Social links removed in this flow

  const validate = (cats = categories) => {
    const e = {};
    if (!name.trim()) e.name = 'Build name is required';
    // Author is optional (can be provided here) — otherwise credits come from your session
    if (!glbFile) e.glb = 'A .glb file is required for the 3D preview';
    if (!mcstructureFile) e.mcstructure = 'A .mcstructure file is required';
    if (!Array.isArray(cats) || cats.length === 0) e.categories = 'Add at least one category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    // If the user typed a category but didn't press Enter, include it automatically
    const trimmedCat = String(catInput || '').trim();
    let finalCategories = categories.slice();
    if (trimmedCat && !finalCategories.includes(trimmedCat)) finalCategories = [...finalCategories, trimmedCat];
    // update local state so the UI shows the applied category
    if (finalCategories.length !== categories.length) {
      setCategories(finalCategories);
      setCatInput('');
    }

    if (!validate(finalCategories)) return;
    // Prevent rapid double clicks before React state updates flush
    if (submitLock.current || isSubmitting || cooldown) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setStatus('submitting');
    const API_BASE = process.env.REACT_APP_API_BASE;
    const form = new FormData();
    form.append('name', name.trim());
    form.append('description', description.trim());
    finalCategories.forEach(c => form.append('categories', c));
    // Include optional author name provided in the form (frontend-provided override)
    if (authorName && String(authorName).trim()) {
      form.append('author', String(authorName).trim());
    }
    // credits are derived from the authenticated session server-side
    form.append('glb', glbFile);
    form.append('mcstructure', mcstructureFile);
    // Optionally include client-side materials preview to help backend (server may recompute canonical list)
    if (Array.isArray(materialsPreview) && materialsPreview.length > 0) {
      try { form.append('materials', JSON.stringify(materialsPreview)); } catch(_) {}
    }
    try {
  const res = await fetch(`${API_BASE}/api/submissions`, { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
  setStatus('success');
  // reset some fields but keep files visible
  setName(''); setDescription(''); setCategories([]); setCatInput('');
      setShowSuccess(true);
    } catch (e) {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
      // Short cooldown so the user can't accidentally re-click while UI updates
      setCooldown(true);
      setTimeout(() => setCooldown(false), 1200);
    }
  };

  // Fetch server alias map so local preview applies the same canonicalization as backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/materials-aliases`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && typeof data.aliases === 'object') setAliases(data.aliases || {});
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Parse materials from selected .mcstructure for on-page preview
  useEffect(() => {
    let aborted = false;
    async function run() {
      setMaterialsError('');
      setMaterialsPreview([]);
      if (!mcstructureFile) return;
      if (mcstructureFile && mcstructureFile.size === 0) {
        // Immediate feedback for empty files; avoid spinning forever
        setMaterialsError('This .mcstructure file is empty (0 bytes).');
        return;
      }
      setMaterialsLoading(true);
      try {
        // Try plain JSON first
        let counts = null;
        try {
          const text = await mcstructureFile.text();
          const json = JSON.parse(text);
          counts = extractCountsFromStructureJson(json);
          if (Object.keys(counts).length === 0) counts = null; // fall through to other strategies
        } catch (_) {}

        // Try gzip->JSON via DecompressionStream if needed
        if (!counts) {
          try {
            if ('DecompressionStream' in window) {
              const ds = new DecompressionStream('gzip');
              const ab = await mcstructureFile.arrayBuffer();
              const gunzippedStream = new Response(new Blob([ab]).stream().pipeThrough(ds));
              const text2 = await gunzippedStream.text();
              const json2 = JSON.parse(text2);
              counts = extractCountsFromStructureJson(json2);
              if (Object.keys(counts).length === 0) counts = null;
            }
          } catch (_) {}
        }

        // Try NBT parser (nbtify) for true .mcstructure NBT
        if (!counts) {
          try {
            const ab = await mcstructureFile.arrayBuffer();
            // dynamic import from ESM only at runtime to avoid bundler resolution
            const NBT = await (0, eval)('import("https://esm.sh/nbtify-readonly-typeless@1.1.2?keep-names")');
            let nbt;
            try {
              const res = await NBT.read(ab, { endian: 'little', strict: false });
              nbt = res?.data || res;
            } catch (e1) {
              const res2 = await NBT.read(ab); // generic
              nbt = res2?.data || res2;
            }
            counts = extractCountsFromNbt(nbt);
          } catch (e) {
            // ignore; will report below
          }
        }

        // Fallback: ask backend preview endpoint to parse materials without submitting
        let list = [];
        if (!counts) {
          try {
            const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
            const fd = new FormData();
            fd.append('mcstructure', mcstructureFile);
            const res = await fetch(`${API_BASE}/api/preview/materials`, { method: 'POST', body: fd });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data?.materials)) {
                list = data.materials;
              }
            }
          } catch (_) {}
        }

        // If still empty, keep polling the backend briefly with backoff before giving up
        if ((!counts || Object.keys(counts).length === 0) && list.length === 0) {
          const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
          for (let attempt = 0; attempt < 4 && !aborted; attempt++) {
            try {
              await new Promise(r => setTimeout(r, 400 * (attempt + 1))); // 0.4s, 0.8s, 1.2s, 1.6s
              const fd2 = new FormData();
              fd2.append('mcstructure', mcstructureFile);
              const res2 = await fetch(`${API_BASE}/api/preview/materials`, { method: 'POST', body: fd2, cache: 'no-store' });
              if (res2.ok) {
                const data2 = await res2.json();
                const mats = Array.isArray(data2?.materials) ? data2.materials : [];
                if (mats.length > 0) { list = mats; break; }
              }
            } catch (_) {}
          }
        }

        if (!counts && list.length === 0) throw new Error('Unsupported .mcstructure format for preview');
        if (list.length === 0) {
          list = Object.entries(counts)
            .sort((a,b)=> b[1]-a[1])
            .map(([name, count]) => ({
              icon: applyAliasFull(name),
              itemname: titleCase(stripNs(applyAliasFull(name)).replace(/_/g,' ')),
              amount: count
            }));
        }
        if (!aborted) setMaterialsPreview(list);
      } catch (err) {
        if (!aborted) setMaterialsError(err?.message || 'Could not generate materials preview.');
      } finally {
        if (!aborted) setMaterialsLoading(false);
      }
    }
    run();
    return () => { aborted = true; };
  }, [mcstructureFile]);

  // NOTE: panel height is handled by CSS now (fixed max-height with internal scrollbar)

  function stripNs(s) { return String(s).replace(/^minecraft:/,''); }
  function titleCase(s) {
    return String(s)
      .split(/\s+|_/g)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  function applyAliasBase(base) {
    const key = String(base || '').toLowerCase();
    return aliases[key] || key;
  }
  function applyAliasFull(full) {
    const base = stripNs(full).toLowerCase();
    return `minecraft:${applyAliasBase(base)}`;
  }

  function extractCountsFromStructureJson(json) {
    const counts = {};
    // Pattern 1: { structure: { palette: [...], blocks: [{ state: idx, ...}, ...] } }
    try {
      const palette = json?.structure?.palette;
      const blocks = json?.structure?.blocks;
      if (Array.isArray(palette) && Array.isArray(blocks)) {
        const getNameFromPalette = (entry) => entry?.nbt?.name || entry?.name || entry?.block?.name || '';
        for (const blk of blocks) {
          const idx = blk?.state ?? blk?.palette ?? blk?.block_palette_index;
          if (idx == null || !palette[idx]) continue;
          const name = getNameFromPalette(palette[idx]);
          if (!name) continue;
          counts[name] = (counts[name] || 0) + 1;
        }
        if (Object.keys(counts).length) return counts;
      }
    } catch(_) {}
    // Pattern 2: flat blocks array with names
    try {
      const blocks2 = json?.blocks;
      if (Array.isArray(blocks2)) {
        for (const b of blocks2) {
          const name = b?.name || b?.block?.name || b?.nbt?.name;
          if (!name) continue;
          counts[name] = (counts[name] || 0) + 1;
        }
        if (Object.keys(counts).length) return counts;
      }
    } catch(_) {}
    // Pattern 3: unsupported format
    return counts;
  }

  function extractCountsFromNbt(nbt) {
    const counts = {};
    if (!nbt || typeof nbt !== 'object') return counts;
    const structure = nbt.structure || nbt.Structure || nbt['minecraft:structure'] || {};
    // Palette candidates
    let palette = structure.palette || structure.block_palette || structure['block_palette'] || structure?.palettes?.[0]?.block_palette || structure?.palettes?.block_palette;
    // Blocks candidates
    let blocks = structure.blocks || structure['block_indices'] || structure['block_index'] || null;
    if (palette && palette.default) palette = palette.default;
    // Normalize palette array
    let paletteArr = [];
    if (Array.isArray(palette)) paletteArr = palette;
    else if (Array.isArray(palette?.block_palette)) paletteArr = palette.block_palette;
    else if (Array.isArray(palette?.palette)) paletteArr = palette.palette;
    const getNameFromPalette = (entry) => entry?.nbt?.name || entry?.name || entry?.block?.name || entry?.states?.name || '';
    if (Array.isArray(blocks) && paletteArr.length) {
      for (const blk of blocks) {
        const idx = blk?.state ?? blk?.palette ?? blk?.block_palette_index ?? blk?.block_index ?? blk?.index;
        if (idx == null || !paletteArr[idx]) continue;
        const name = getNameFromPalette(paletteArr[idx]);
        if (!name) continue;
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return counts;
  }

  // If not logged in, only show a centered login prompt
  if (!loading && !user) {
    return (
      <div className="page upload-page" style={{ minHeight: 'calc(100dvh - var(--nav-h))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="panel" style={{ textAlign: 'center', maxWidth: 480 }}>
          <h2 style={{ marginTop: 0 }}>Upload a Build</h2>
          <p className="muted">Please log in with Discord to submit a build.</p>
          <button className="btn primary" onClick={login}><i className="fa-brands fa-discord" aria-hidden="true"></i> Login with Discord</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page upload-page">
      <h2>Upload a Build</h2>

      <form className="form-card" onSubmit={onSubmit} aria-disabled={!user}>
        <div className="field-row">
          <div className="field">
            <label>Build name <span className="req">*</span></label>
            <input className={`input ${submitted && errors.name ? 'input-error' : ''}`} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Medieval Watchtower" disabled={!user} />
            {submitted && errors.name && <div className="error-text">{errors.name}</div>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description of your build" disabled={!user} />
          </div>
        </div>

        

        <div className="field-row">
          <div className="field">
            <label>Categories <span className="req">*</span></label>
            <div className={`chips ${submitted && errors.categories ? 'input-error' : ''}`}>
              {categories.map((c, idx) => (
                <span className="chip" key={idx}>{c}<button type="button" className="chip-x" onClick={() => removeCategory(idx)} aria-label={`Remove ${c}`}>×</button></span>
              ))}
              <input
                className="chip-input"
                type="text"
                value={catInput}
                onChange={(e) => setCatInput(e.target.value)} disabled={!user}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCategory(); } }}
                placeholder="Type and press Enter"
              />
            </div>
            {submitted && errors.categories && <div className="error-text">{errors.categories}</div>}
          </div>
        </div>

        <div className="field-row two">
          <div className="field">
            <label>.glb file (3D preview) <span className="req">*</span></label>
            <input className={`input-file ${submitted && errors.glb ? 'input-error' : ''}`} type="file" accept=".glb,.GLB" onChange={(e) => setGlbFile(e.target.files?.[0] || null)} disabled={!user} />
            {glbFile && <div className="file-meta">{glbFile.name} • {(glbFile.size/1024/1024).toFixed(2)} MB</div>}
            {submitted && errors.glb && <div className="error-text">{errors.glb}</div>}
          </div>
          <div className="field">
            <label>.mcstructure file <span className="req">*</span></label>
            <input className={`input-file ${submitted && errors.mcstructure ? 'input-error' : ''}`} type="file" accept=".mcstructure" onChange={(e) => setMcstructureFile(e.target.files?.[0] || null)} disabled={!user} />
            {mcstructureFile && <div className="file-meta">{mcstructureFile.name} • {(mcstructureFile.size/1024/1024).toFixed(2)} MB</div>}
            {submitted && errors.mcstructure && <div className="error-text">{errors.mcstructure}</div>}
            <div className="help">Required for in-game structure placement.</div>
          </div>
        </div>

        {/* Materials preview panel: collapsed by default, toggle to expand */}
  {(mcstructureFile) && (
          <div className="panel" style={{ marginTop: 12 }}>
            <div
              className="panel-head"
              role="button"
              tabIndex={0}
              onClick={() => setMaterialsOpen(o => !o)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMaterialsOpen(o => !o); } }}
              aria-expanded={materialsOpen}
              aria-controls="materials-panel"
            >
              <strong>Materials (preview)</strong>
              <span className="toggle-materials" aria-hidden="true" style={{ marginLeft: 'auto', pointerEvents: 'none' }}>
                <i className={`fa-solid fa-chevron-right ${materialsOpen ? 'is-open' : ''}`} aria-hidden="true"></i>
              </span>
            </div>

            <div id="materials-panel" className={`panel-body ${materialsOpen ? 'is-open' : ''}`} aria-hidden={!materialsOpen}>
              {materialsLoading && <p className="muted">Analyzing .mcstructure…</p>}
              {!materialsLoading && materialsError && (
                <p className="muted">{materialsError} The final list will be computed after upload.</p>
              )}
              {!materialsLoading && !materialsError && materialsPreview.length === 0 && (
                <p className="muted">No materials detected in this file.</p>
              )}
              {!materialsLoading && !materialsError && materialsPreview.length>0 && (
                <ul className="materials-list">
                  {materialsPreview.map((m,i)=> {
                    const id = (m.icon || '').replace(/^minecraft:/, '');
                    const iconUrl = id ? `https://mc.nerothe.com/img/1.21.8/minecraft_${id}.png` : '';
                    return (
                      <li key={i} style={{ breakInside: 'avoid', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.3 }}>
                        {iconUrl && (
                          <img
                            src={iconUrl}
                            alt={m.itemname}
                            width={20}
                            height={20}
                            loading="lazy"
                            style={{ display: 'inline-block', borderRadius: 4, background: 'rgba(0,0,0,0.06)' }}
                            onError={(e)=>{ e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <span style={{ flex: 1 }}>{m.itemname}</span>
                        <span style={{ opacity: 0.8 }}>× {m.amount}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Credits panel removed; author comes from your Discord account */}

        {/* Optional author field moved to bottom so it's the last input the user sees */}
        <div className="field-row">
          <div className="field">
            <label>Author (optional)</label>
            <input className="input" type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Your name" disabled={!user} />
            <div className="help">If provided, this will be used as the visible author instead of the Discord username.</div>
          </div>
        </div>

        <div className="field-row">
          <button
            className="btn primary"
            type="submit"
            disabled={!user || isSubmitting || cooldown}
            aria-disabled={!user || isSubmitting || cooldown}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>

      {showSuccess && (
        <div className="modal-backdrop" onClick={() => setShowSuccess(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head"><strong>Submission received</strong></div>
            <p className="muted">Your build was submitted for review. An admin will approve it before it appears on the site.</p>
            <div style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => setShowSuccess(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="panel guide" style={{ marginTop: 20 }}>
        <div className="panel-head"><strong className="guide-title">How to export</strong></div>
        <p className="muted guide-note">Note: This export guide applies to Minecraft Bedrock Edition on Windows only.</p>
        <div className="guide-section">
          <h3>Export .mcstructure (Minecraft Bedrock, Windows only)</h3>
          <ol>
            <li>
              Get a Structure Block in your world.
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/mcstructure/1.png'} alt="Get a Structure Block" />
            </li>
            <li>
              Place the Structure Block and set Mode dropdown to "Save".
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/mcstructure/2.png'} alt="Set Mode to Save" />
            </li>
            <li>
              Enter a structure name and adjust the size (X, Y, Z) and offset to cover your build.
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/mcstructure/3.png'} alt="Adjust size and offset" />
            </li>
            <li>
              Click "Export" to export the structure to your local game folder.
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/mcstructure/4.png'} alt='Click "Export" to export structure' />
            </li>
            <li>
              Choose a directory to save your .mcstructure file.
              <img className="screenshot-ph small" src={process.env.PUBLIC_URL + '/screenshots/mcstructure/5.png'} alt="Choose a directory to save your .mcstructure file" />
            </li>
          </ol>
        </div>
        <div className="guide-section">
          <h3>Export .glb (3D model)</h3>
          <ol>
            <li>
              Using the same Structure Block flow, set the Mode dropdown to "3D Export".
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/glb/1.png'} alt="Set Mode to 3D Export" />
            </li>
            <li>
              Adjust the size (X, Y, Z) and offset to cover your build.
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/glb/2.png'} alt="Adjust size for 3D Export" />
            </li>
            <li>
              Click "Export". This exports your build as a .glb file.
              <img className="screenshot-ph" src={process.env.PUBLIC_URL + '/screenshots/mcstructure/4.png'} alt="Click Export to save .glb" />
            </li>
            <li>
              Choose a directory to save your .glb file.
              <img className="screenshot-ph small" src={process.env.PUBLIC_URL + '/screenshots/glb/4.png'} alt="Choose directory to save .glb" />
            </li>
          </ol>
        </div>
        
      </div>
    </div>
  );
}
