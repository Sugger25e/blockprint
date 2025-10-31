import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/UiContext';
import ModelViewer from '../components/ModelViewer';

export default function Upload() {
  const { user, loading, login } = useAuth();
  const { showToast } = useToast();
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
  // Predefined category options (users must choose from these)
  const PRESET_CATEGORIES = ['Survival','Creative','Redstone','Farm','Adventure','Building','Decoration','Multiplayer','Hardcore','Mini-Game','Simple'];
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

  // Preview URL for selected .glb file (object URL). Created when a file is selected and revoked on change/unmount.
  const [glbPreviewUrl, setGlbPreviewUrl] = useState(null);
  // ref to underlying ModelViewer so we can capture a PNG preview
  const viewerRef = useRef(null);
  // Generated preview (blob + object URL) that will be included in the final submission if present
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  // (no unsaved-toast on Upload page)
  useEffect(() => {
    if (!glbFile) {
      setGlbPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(glbFile);
    setGlbPreviewUrl(url);
    return () => {
      try { URL.revokeObjectURL(url); } catch (e) {}
      setGlbPreviewUrl(null);
    };
  }, [glbFile]);

  // Revoke preview object URL when previewFile changes or on unmount
  useEffect(() => {
    return () => {
      try { if (previewUrl) URL.revokeObjectURL(previewUrl); } catch (e) {}
    };
  }, [previewUrl]);

  // no unsaved-change toast needed on Upload page
  // Anti-duplicate submit: lock while request is in-flight and keep a short cooldown after
  const submitLock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const hcaptchaWidgetIdRef = useRef(null);
  const hcaptchaContainerRef = useRef(null);
  const modalHcaptchaContainerRef = useRef(null);
  const pendingFormRef = useRef(null);
  const [showCaptchaDialog, setShowCaptchaDialog] = useState(false);
  const HCAPTCHA_SITEKEY = process.env.REACT_APP_HCAPTCHA_SITEKEY;
  const navigate = useNavigate();

  const toggleCategory = (val) => {
    if (categories.includes(val)) {
      setCategories(categories.filter(c => c !== val));
      return;
    }
    // limit to 3
    if (categories.length >= 3) return;
    setCategories([...categories, val]);
  };

  // Social links removed in this flow

  const validate = (cats = categories) => {
    const e = {};
    if (!name.trim()) e.name = 'Build name is required';
    // Author is optional (can be provided here) — otherwise credits come from your session
    if (!glbFile) e.glb = 'A .glb file is required for the 3D preview';
    if (!mcstructureFile) e.mcstructure = 'A .mcstructure file is required';
    // Require the user to generate a preview image before submitting
    if (!previewFile) e.preview = 'Generate a preview image before submitting';
    if (!Array.isArray(cats) || cats.length === 0) e.categories = 'Add at least one category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Final categories are the selected preset categories (no free-text input)
    const finalCategories = categories.slice();

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
    // include generated preview image if present
    if (previewFile) form.append('preview', previewFile, 'preview.png');
    // Optionally include client-side materials preview to help backend (server may recompute canonical list)
    if (Array.isArray(materialsPreview) && materialsPreview.length > 0) {
      try { form.append('materials', JSON.stringify(materialsPreview)); } catch(_) {}
    }
    try {
      // If hCaptcha is configured, open a modal with the visible widget and complete captcha there.
      if (HCAPTCHA_SITEKEY && typeof window !== 'undefined' && window.hcaptcha) {
  pendingFormRef.current = { name: name.trim(), description: description.trim(), categories: finalCategories, authorName: authorName && String(authorName).trim(), glbFile, mcstructureFile, materialsPreview, previewFile };
        setShowCaptchaDialog(true);
        setIsSubmitting(false);
        submitLock.current = false;
        return;
      }

      const res = await fetch(`${API_BASE}/api/submissions`, { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      setStatus('success');
      setName(''); setDescription(''); setCategories([]);
      setShowSuccess(true);
      try { showToast('Submission posted'); } catch {}
      try { if (HCAPTCHA_SITEKEY && window && window.hcaptcha && hcaptchaWidgetIdRef.current != null) window.hcaptcha.reset(hcaptchaWidgetIdRef.current); } catch (e) { }
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

  // Capture a PNG from the ModelViewer and store it as a preview to include with the submission
  async function handleGeneratePreview() {
    if (!viewerRef || !viewerRef.current) {
      try { showToast('Viewer not ready'); } catch(_) {}
      return;
    }
    setPreviewGenerating(true);
    try {
      const blob = await viewerRef.current.capture({ quality: 1.0, scale: 2 });
      if (!blob) throw new Error('Capture failed');
      const url = URL.createObjectURL(blob);
      // revoke previous preview URL if any
      try { if (previewUrl) URL.revokeObjectURL(previewUrl); } catch (_) {}
      setPreviewFile(blob);
      setPreviewUrl(url);
      try { showToast('Preview generated — it will be uploaded with your submission'); } catch (_) {}
    } catch (e) {
      console.error('preview capture failed', e);
      try { showToast('Could not generate preview'); } catch (_) {}
    } finally {
      setPreviewGenerating(false);
    }
  }

  function handleClearPreview() {
    try { if (previewUrl) URL.revokeObjectURL(previewUrl); } catch (_) {}
    setPreviewFile(null);
    setPreviewUrl(null);
  }

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

  // Load hCaptcha script when sitekey is configured
  useEffect(() => {
    if (!HCAPTCHA_SITEKEY) return;
    if (typeof window === 'undefined') return;
    if (window.hcaptcha) return;
    const id = 'hcaptcha-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.src = 'https://js.hcaptcha.com/1/api.js';
    s.async = true;
    s.defer = true;
    s.id = id;
    s.onload = () => {};
    s.onerror = () => { console.error('Failed to load hcaptcha script'); };
    document.head.appendChild(s);
    return () => {};
  }, [HCAPTCHA_SITEKEY]);

  // Render visible hCaptcha checkbox widget into a modal container when the captcha dialog is shown
  useEffect(() => {
    if (!HCAPTCHA_SITEKEY) return;
    if (!showCaptchaDialog) return;
    if (typeof window === 'undefined') return;
    let mounted = true;
    const tryRender = () => {
      if (!mounted) return;
      if (!modalHcaptchaContainerRef.current) return;
      if (!window.hcaptcha) return;
      if (hcaptchaWidgetIdRef.current != null) return;
      try {
        hcaptchaWidgetIdRef.current = window.hcaptcha.render(modalHcaptchaContainerRef.current, {
          sitekey: HCAPTCHA_SITEKEY,
          size: 'normal',
          callback: () => {
            // visible widget will set response; we read it when the user clicks Post in the modal
          }
        });
      } catch (e) {
        console.error('hcaptcha render failed', e);
      }
    };
    tryRender();
    const poll = setInterval(tryRender, 300);
    const to = setTimeout(() => clearInterval(poll), 5000);
    return () => { mounted = false; clearInterval(poll); clearTimeout(to); };
  }, [HCAPTCHA_SITEKEY, showCaptchaDialog]);

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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_CATEGORIES.map((opt) => {
                  const selected = categories.includes(opt);
                  const disabled = !selected && categories.length >= 3;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleCategory(opt)}
                      className={`btn ${selected ? 'primary' : ''}`}
                      style={{ padding: '6px 10px', borderRadius: 999 }}
                      disabled={!user || disabled}
                      aria-pressed={selected}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8 }} className="help">Select up to 3 categories</div>
            </div>
            {submitted && errors.categories && <div className="error-text">{errors.categories}</div>}
          </div>
        </div>

       <div className="field-row">
          <div className="field">
            <label>.glb file (3D preview)</label>
            <input type="file" accept=".glb,.GLB" onChange={(e)=>setGlbFile(e.target.files?.[0]||null)} />
            {glbFile && <div className="file-meta">{glbFile.name} • {(glbFile.size/1024/1024).toFixed(2)} MB</div>}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 920, height: 280, minHeight: 280, maxHeight: 280, boxSizing: 'border-box', overflow: 'hidden' }}>
                {/* Left: model viewer - take half the width */}
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', display: 'flex' }}>
                  {glbPreviewUrl ? (
                    <ModelViewer url={glbPreviewUrl} fitMargin={4.0} background={'var(--viewer-bg)'} ref={(el)=>{ if (el) viewerRef.current = el; }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>No model selected</div>
                  )}
                </div>

                {/* Right: preview area - take half the width */}
                <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    { (previewUrl) ? (
                      <img src={previewUrl} alt="Preview" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    ) : (
                      <div className="muted" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px dashed var(--border)' }}>No preview</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" className="btn" onClick={handleGeneratePreview} disabled={previewGenerating}>{previewGenerating ? 'Generating…' : 'Generate preview image'}</button>
                    </div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ previewUrl ? 'Unsaved' : '' }</div>
                  </div>
                  {submitted && errors.preview && (
                    <div className="error-text" style={{ marginTop: 8 }}>{errors.preview}</div>
                  )}
                </div>
              </div>
              {/* Responsive fallback: on narrow screens stack visually via CSS (keeps inline styles simple) */}
            </div>
          </div>
        </div>

        <div className="field-row">
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

  {/* Captcha is shown in a modal popup (like comments). The inline container was removed. */}

        <div className="field-row">
          <button
            className="btn primary"
            type="submit"
            disabled={!user || isSubmitting || cooldown || !previewFile}
            aria-disabled={!user || isSubmitting || cooldown || !previewFile}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>

      {/* Captcha modal for Upload submissions (shown when configured) */}
      {showCaptchaDialog && (
        <div role="dialog" aria-modal="true" className="modal-backdrop" style={{ zIndex: 2200 }} onClick={() => { if (isSubmitting) return; setShowCaptchaDialog(false); try { if (hcaptchaWidgetIdRef.current != null) { window.hcaptcha.reset(hcaptchaWidgetIdRef.current); hcaptchaWidgetIdRef.current = null; } } catch (e) {} }}>
          <div className="modal confirm-pop captcha-modal" style={{ maxWidth: 540, width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">Please verify you are human</div>
            <div className="muted" style={{ marginBottom: 12 }}>Complete the captcha below to confirm you're not a bot.</div>
            <div ref={modalHcaptchaContainerRef} className="hcaptcha-widget" style={{ marginBottom: 12 }} />
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="btn" disabled={isSubmitting} onClick={() => { if (isSubmitting) return; setShowCaptchaDialog(false); try { if (hcaptchaWidgetIdRef.current != null) { window.hcaptcha.reset(hcaptchaWidgetIdRef.current); hcaptchaWidgetIdRef.current = null; } } catch (e) {} }}>Cancel</button>
              <button className="btn primary" disabled={isSubmitting} onClick={async () => {
                if (!window || !window.hcaptcha || hcaptchaWidgetIdRef.current == null) { showToast('Captcha not ready'); return; }
                const token = window.hcaptcha.getResponse(hcaptchaWidgetIdRef.current);
                if (!token) { showToast('Please complete the captcha'); return; }
                // Build form from pending values
                const p = pendingFormRef.current || {};
                const fd = new FormData();
                fd.append('name', p.name || '');
                fd.append('description', p.description || '');
                (p.categories || []).forEach(c => fd.append('categories', c));
                if (p.authorName) fd.append('author', p.authorName);
                if (p.glbFile) fd.append('glb', p.glbFile);
                if (p.mcstructureFile) fd.append('mcstructure', p.mcstructureFile);
                if (p.previewFile) fd.append('preview', p.previewFile, 'preview.png');
                if (Array.isArray(p.materialsPreview) && p.materialsPreview.length > 0) {
                  try { fd.append('materials', JSON.stringify(p.materialsPreview)); } catch (_) {}
                }
                fd.append('hcaptchaToken', token);
                setIsSubmitting(true);
                try {
                  const res = await fetch(`${process.env.REACT_APP_API_BASE}/api/submissions`, { method: 'POST', body: fd, credentials: 'include' });
                  if (!res.ok) throw new Error('Failed');
                  setStatus('success');
                  setName(''); setDescription(''); setCategories([]);
                  setShowSuccess(true);
                  try { showToast('Submission posted'); } catch {}
                  // After successful captcha-submitted post, redirect to home
                  try { navigate('/'); } catch (_) {}
                } catch (err) {
                  console.error('submission failed', err);
                  setStatus('error');
                } finally {
                  setIsSubmitting(false);
                  setShowCaptchaDialog(false);
                  try { window.hcaptcha.reset(hcaptchaWidgetIdRef.current); } catch (e) {}
                  hcaptchaWidgetIdRef.current = null;
                }
              }}>{isSubmitting ? 'Posting…' : 'Post'}</button>
            </div>
          </div>
        </div>
      )}

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
