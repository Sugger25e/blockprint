import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModelViewer from '../components/ModelViewer';
import ModelCard from '../components/ModelCard';
import { useAuth } from '../context/AuthContext';
import NotFound from './NotFound';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export default function Admin() {
  const { user, loading } = useAuth();

  const [subs, setSubs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return t || 'submissions';
  });
  const [builds, setBuilds] = useState([]);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const viewerRefs = useRef({});

  useEffect(() => {
    // load submissions when requested (or on mount if default tab)
    if (!user?.isAdmin) return;
    if (tab !== 'submissions') return;
    (async () => {
      setAdminLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/admin/submissions`, { credentials: 'include' });
        const data = await res.json();
        const arr = Array.isArray(data?.submissions) ? data.submissions : [];
        const normalized = arr.map(s => ({
          ...s,
          glbUrl: s.glbUrl?.startsWith('http') ? s.glbUrl : `${API_BASE}${s.glbUrl || ''}`,
          mcstructureUrl: s.mcstructureUrl?.startsWith('http') ? s.mcstructureUrl : `${API_BASE}${s.mcstructureUrl || ''}`,
        }));
        setSubs(normalized);
      } catch (_) {}
      setAdminLoading(false);
    })();
  }, [user, tab]);

  // expose an explicit loader so other interactions can refresh submissions
  const loadSubs = async () => {
    if (!user?.isAdmin) return;
    setAdminLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/submissions`, { credentials: 'include' });
      const data = await res.json();
      const arr = Array.isArray(data?.submissions) ? data.submissions : [];
      const normalized = arr.map(s => ({
        ...s,
        glbUrl: s.glbUrl?.startsWith('http') ? s.glbUrl : `${API_BASE}${s.glbUrl || ''}`,
        mcstructureUrl: s.mcstructureUrl?.startsWith('http') ? s.mcstructureUrl : `${API_BASE}${s.mcstructureUrl || ''}`,
      }));
      setSubs(normalized);
    } catch (_) {
      setSubs([]);
    }
    setAdminLoading(false);
  };

  const loadBuilds = async () => {
    setBuildsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/builds`, { cache: 'no-store' });
      const data = await res.json();
      const arr = Array.isArray(data?.models) ? data.models : [];
      const normalized = arr.map(m => ({
        ...m,
        url: m.url?.startsWith('http') ? m.url : `${API_BASE}${m.url || ''}`,
        previewImage: m.previewImage && (m.previewImage.startsWith('http') ? m.previewImage : `${API_BASE}${m.previewImage}`)
      }));
      setBuilds(normalized);
    } catch (_) {
      setBuilds([]);
    }
    setBuildsLoading(false);
  };
  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === 'manage') loadBuilds();
    if (tab === 'drafts') loadDrafts();
  }, [user, tab]);

  // Keep tab in sync with URL search params (so back/forward preserves selection)
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && t !== tab) setTab(t);
  }, [searchParams]);

  // Central tab setter that updates the URL and triggers loaders (no full reload)
  const handleSetTab = (t) => {
    // normalize allowed tabs
    const allowed = ['submissions', 'drafts', 'manage', 'upload'];
    const target = allowed.includes(t) ? t : 'submissions';
    setTab(target);
    try { setSearchParams({ tab: target }); } catch (_) {}
    // trigger immediate reload of the tab's data
    if (target === 'submissions') loadSubs();
    if (target === 'manage') loadBuilds();
    if (target === 'drafts') loadDrafts();
  };

  const loadDrafts = async () => {
    setDraftsLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/admin/builds?ready=false`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      const arr = Array.isArray(data?.builds) ? data.builds : [];
      const normalized = arr.map(m => ({
        ...m,
        url: m.url?.startsWith('http') ? m.url : `${API_BASE}${m.url || ''}`,
        mcstructureUrl: m.mcstructureUrl ? (m.mcstructureUrl.startsWith('http') ? m.mcstructureUrl : `${API_BASE}${m.mcstructureUrl}`) : null,
        holoprintUrl: m.holoprintUrl ? (m.holoprintUrl.startsWith('http') ? m.holoprintUrl : `${API_BASE}${m.holoprintUrl}`) : null,
        previewImageUrl: m.previewImageUrl ? (m.previewImageUrl.startsWith('http') ? m.previewImageUrl : `${API_BASE}${m.previewImageUrl}`) : null,
      }));
      setDrafts(normalized);
    } catch (_) { setDrafts([]); }
    setDraftsLoading(false);
  };

  // Admin login removed; access controlled via Discord ID whitelist on session

  const approve = async (id) => {
    if (!window.confirm('Approve this submission? This will go to Drafts tab for verification.')) return;
  await fetch(`${API_BASE}/api/admin/submissions/${id}/approve`, { method: 'POST', credentials: 'include' });
    setSubs(subs.filter(s => s.id !== id));
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this submission?')) return;
  await fetch(`${API_BASE}/api/admin/submissions/${id}`, { method: 'DELETE', credentials: 'include' });
    setSubs(subs.filter(s => s.id !== id));
  };

  const removeBuild = async (build) => {
    const label = build?.name || 'this build';
    if (!window.confirm(`Remove ${label}?`)) return;
    const buildId = build.buildId; // Mongo _id provided by API
    if (!buildId) return;
  await fetch(`${API_BASE}/api/admin/builds/${encodeURIComponent(buildId)}`, { method: 'DELETE', credentials: 'include' });
    setBuilds(prev => prev.filter(b => b.buildId !== buildId));
  };

  const [upName, setUpName] = useState('');
  const [upDesc, setUpDesc] = useState('');
  // Categories (chips) like public Upload
  const [adCategories, setAdCategories] = useState([]);
  const [adCatInput, setAdCatInput] = useState('');
  const addCategory = () => {
    const val = adCatInput.trim();
    if (!val) return;
    if (!adCategories.includes(val)) setAdCategories([...adCategories, val]);
    setAdCatInput('');
  };
  const removeCategory = (idx) => setAdCategories(adCategories.filter((_, i) => i !== idx));

  // Admin uploads do not accept custom credits — author is set to Blockprint Team.
  const [upGlb, setUpGlb] = useState(null);
  const [upMc, setUpMc] = useState(null);
  const [upHoloprint, setUpHoloprint] = useState(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  // Admin upload validation state
  const [upSubmitted, setUpSubmitted] = useState(false);
  const [upErrors, setUpErrors] = useState({});
  const [upMaterials, setUpMaterials] = useState([]);
  const [upMatLoading, setUpMatLoading] = useState(false);
  const [upMatError, setUpMatError] = useState('');
  const [upMaterialsOpen, setUpMaterialsOpen] = useState(false);
  const [aliasesMap, setAliasesMap] = useState({});
  const uploadDirect = async (e) => {
    e.preventDefault();
    if (adminSubmitting) return;
    // mark that admin tried to submit so validation messages show
    setUpSubmitted(true);
    // If the admin typed a category into the input but didn't press Enter, apply it
    const trimmedCat = String(adCatInput || '').trim();
    let finalCategories = adCategories.slice();
    if (trimmedCat && !finalCategories.includes(trimmedCat)) finalCategories = [...finalCategories, trimmedCat];
    // update local UI state to reflect applied category
    if (finalCategories.length !== adCategories.length) {
      setAdCategories(finalCategories);
      setAdCatInput('');
    }

    // Client-side validation: require name, .glb, .mcstructure, and at least one category
    const errors = {};
    if (!upName || !String(upName).trim()) errors.name = 'Build name is required';
    if (!upGlb) errors.glb = 'A .glb file is required';
    if (!upMc) errors.mc = 'A .mcstructure file is required';
    if (!Array.isArray(finalCategories) || finalCategories.length === 0) errors.categories = 'Add at least one category';
    setUpErrors(errors);
    if (Object.keys(errors).length > 0) return; // don't start submitting while required fields missing

    const fd = new FormData();
    fd.append('name', upName.trim());
    fd.append('description', String(upDesc || '').trim());
    finalCategories.forEach(c => fd.append('categories', c));
    // Always set visible author for admin uploads to Blockprint Team and attach an icon
    const credits = { author: 'Blockprint Team', icon: `${process.env.PUBLIC_URL || ''}/logo.png` };
    fd.append('credits', JSON.stringify(credits));
    if (upGlb) fd.append('glb', upGlb);
    if (upMc) fd.append('mcstructure', upMc);
    // optionally include a holoprint file uploaded by admin
    if (upHoloprint) fd.append('holoprint', upHoloprint);
    // Always mark admin uploads as ready/published
    fd.append('ready', 'true');
    try {
      setAdminSubmitting(true);
      const res = await fetch(`${API_BASE}/api/admin/builds`, { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      // try to parse returned build id and mark ready if server didn't via 'ready' flag
      let data = {};
      try { data = await res.json(); } catch(_) { data = {}; }
      const buildId = data?.buildId || data?.id || data?.build?.buildId || data?.build?.id;
      if (buildId) {
        try {
          await fetch(`${API_BASE}/api/admin/builds/${encodeURIComponent(buildId)}/ready`, { method: 'POST', credentials: 'include' });
        } catch (_) {}
      }
      setUpName(''); setUpDesc(''); setAdCategories([]); setAdCatInput(''); setUpGlb(null); setUpMc(null); setUpHoloprint(null); setUpMaterials([]); setUpMatError('');
      setUpSubmitted(false); setUpErrors({});
      alert('Build uploaded');
    } catch (err) {
      alert(err?.message || 'Upload failed');
    } finally {
      setAdminSubmitting(false);
    }
  };

  // Fetch aliases for consistent preview formatting (same as Upload page)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/materials-aliases`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && typeof data.aliases === 'object') setAliasesMap(data.aliases || {});
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Admin Upload: parse materials from selected .mcstructure for preview
  useEffect(() => {
    let aborted = false;
    async function run() {
      setUpMatError('');
      setUpMaterials([]);
      if (!upMc) return;
      if (upMc.size === 0) { setUpMatError('This .mcstructure file is empty (0 bytes).'); return; }
      setUpMatLoading(true);
      try {
        // Attempt JSON parse
        let counts = null;
        try {
          const text = await upMc.text();
          const json = JSON.parse(text);
          counts = extractCountsFromStructureJson(json);
          if (Object.keys(counts).length === 0) counts = null;
        } catch(_) {}

        // Attempt gzip->JSON
        if (!counts) {
          try {
            if ('DecompressionStream' in window) {
              const ds = new DecompressionStream('gzip');
              const ab = await upMc.arrayBuffer();
              const gunzipped = new Response(new Blob([ab]).stream().pipeThrough(ds));
              const text2 = await gunzipped.text();
              const json2 = JSON.parse(text2);
              counts = extractCountsFromStructureJson(json2);
              if (Object.keys(counts).length === 0) counts = null;
            }
          } catch(_) {}
        }

        // Attempt NBT
        if (!counts) {
          try {
            const ab = await upMc.arrayBuffer();
            const NBT = await (0, eval)('import("https://esm.sh/nbtify-readonly-typeless@1.1.2?keep-names")');
            let nbt;
            try {
              const res = await NBT.read(ab, { endian: 'little', strict: false });
              nbt = res?.data || res;
            } catch(_) {
              const res2 = await NBT.read(ab);
              nbt = res2?.data || res2;
            }
            counts = extractCountsFromNbt(nbt);
          } catch(_) {}
        }

        // Backend fallback + brief polling
        let list = [];
        if (!counts) {
          try {
            const fd = new FormData(); fd.append('mcstructure', upMc);
            const res = await fetch(`${API_BASE}/api/preview/materials`, { method: 'POST', body: fd });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data?.materials)) list = data.materials;
            }
          } catch(_) {}
        }
        if ((!counts || Object.keys(counts).length === 0) && list.length === 0) {
          for (let attempt=0; attempt<4 && !aborted; attempt++) {
            try {
              await new Promise(r=>setTimeout(r, 400*(attempt+1)));
              const fd2 = new FormData(); fd2.append('mcstructure', upMc);
              const res2 = await fetch(`${API_BASE}/api/preview/materials`, { method: 'POST', body: fd2, cache: 'no-store' });
              if (res2.ok) {
                const data2 = await res2.json();
                const mats = Array.isArray(data2?.materials) ? data2.materials : [];
                if (mats.length>0) { list = mats; break; }
              }
            } catch(_) {}
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
        if (!aborted) setUpMaterials(list);
      } catch (err) {
        if (!aborted) setUpMatError(err?.message || 'Could not generate materials preview.');
      } finally {
        if (!aborted) setUpMatLoading(false);
      }
    }
    run();
    return () => { aborted = true; };
  }, [upMc]);

  // helpers (same as Upload)
  function stripNs(s){ return String(s).replace(/^minecraft:/,''); }
  function titleCase(s){ return String(s).split(/\s+|_/g).filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '); }
  function applyAliasBase(base){ const key = String(base||'').toLowerCase(); return aliasesMap[key] || key; }
  function applyAliasFull(full){ const base = stripNs(full).toLowerCase(); return `minecraft:${applyAliasBase(base)}`; }

  // parsing helpers (mirrored from public Upload page)
  function extractCountsFromStructureJson(json) {
    const counts = {};
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
    return counts;
  }

  function extractCountsFromNbt(nbt) {
    const counts = {};
    if (!nbt || typeof nbt !== 'object') return counts;
    const structure = nbt.structure || nbt.Structure || nbt['minecraft:structure'] || {};
    let palette = structure.palette || structure.block_palette || structure['block_palette'] || structure?.palettes?.[0]?.block_palette || structure?.palettes?.block_palette;
    let blocks = structure.blocks || structure['block_indices'] || structure['block_index'] || null;
    if (palette && palette.default) palette = palette.default;
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

  if (loading) {
    return <div className="page admin-page"><p className="muted">Loading…</p></div>;
  }
  if (!user?.isAdmin) {
    return <NotFound />;
  }

  return (
    <div className="page admin-page">
      <div className="admin-head">
        <h2>Admin</h2>
        <div className="tabs">
          {/* Tabs now update the URL search param and trigger the appropriate data loaders instead of reloading the page */}
          <button className={`tab ${tab==='submissions'?'active':''}`} onClick={() => handleSetTab('submissions')}>Submissions</button>
          <button className={`tab ${tab==='drafts'?'active':''}`} onClick={() => handleSetTab('drafts')}>Drafts</button>
          <button className={`tab ${tab==='manage'?'active':''}`} onClick={() => handleSetTab('manage')}>Manage</button>
          <button className={`tab ${tab==='upload'?'active':''}`} onClick={() => handleSetTab('upload')}>Upload Build</button>
        </div>
      </div>

      {tab==='submissions' && (
        <div className="panel">
          <div className="panel-head"><strong>Pending submissions</strong></div>
          {adminLoading && (
            <div className="submissions-grid">
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} className="submission-card">
                  <div className="submission-viewer skeleton skeleton-viewer" />
                  <div className="submission-info">
                    <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                    <div className="skeleton skeleton-line" style={{ width: '40%', marginTop: 8 }} />
                    <div className="skeleton skeleton-line" style={{ width: '80%', marginTop: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!adminLoading && subs.length === 0 && <p className="muted">No submissions.</p>}
          {!adminLoading && subs.length > 0 && (
            <div className="submissions-grid">
              {subs.map(s => (
                <div className="submission-card" key={s.id}>
                  <div className="submission-viewer">
                    <ModelViewer url={s.glbUrl} fitMargin={4.0} background={'var(--viewer-bg)'} />
                  </div>
                  <div className="submission-info">
                    <div className="title">{s.name}</div>
                    <div className="muted">by {s.credits?.author || 'Unknown'}</div>
                    <div className="desc">{s.description}</div>
                    <div className="tags">{(s.categories||[]).map((c,i)=>(<span key={i} className="tag">{c}</span>))}</div>
                    {Array.isArray(s.materials) && s.materials.length > 0 && (
                      <div className="materials" style={{ marginTop: 8 }}>
                        <div className="muted" style={{ marginBottom: 4 }}>Materials needed</div>
                        <ul style={{ margin: 0, paddingLeft: 18, columns: 2, columnGap: 24 }}>
                          {s.materials.slice(0, 24).map((m, i) => {
                            const id = (m.icon || '').replace(/^minecraft:/, '');
                            const iconUrl = id ? `https://mc.nerothe.com/img/1.21.8/minecraft_${id}.png` : '';
                            return (
                              <li key={i} style={{ breakInside: 'avoid', display:'flex', alignItems:'center', gap:8 }}>
                                {iconUrl && (
                                  <img src={iconUrl} alt={m.itemname} width={18} height={18} loading="lazy"
                                       style={{ display: 'inline-block', background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}
                                       onError={(e)=>{ e.currentTarget.style.display = 'none'; }} />
                                )}
                                <span style={{ flex: 1 }}>{m.itemname}</span>
                                <span style={{ opacity: 0.8 }}>× {m.amount}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div className="actions">
                      <a className="btn" href={s.mcstructureUrl} download>Download .mcstructure</a>
                      <button className="btn primary" onClick={()=>approve(s.id)}>Approve</button>
                      <button className="btn" onClick={()=>remove(s.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='upload' && (
        <form onSubmit={uploadDirect} className="form-card">
          <div className="field-row">
            <div className="field">
              <label>Build name <span className="req">*</span></label>
              <input className={`input ${upSubmitted && upErrors.name ? 'input-error' : ''}`} type="text" value={upName} onChange={(e)=>setUpName(e.target.value)} placeholder="Ex: Medieval Watchtower" />
              {upSubmitted && upErrors.name && <div className="error-text">{upErrors.name}</div>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" rows={3} value={upDesc} onChange={(e)=>setUpDesc(e.target.value)} placeholder="Short description of the build" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Categories <span className="req">*</span></label>
              <div className={`chips ${upSubmitted && upErrors.categories ? 'input-error' : ''}`}>
                {adCategories.map((c, idx) => (
                  <span className="chip" key={idx}>{c}<button type="button" className="chip-x" onClick={() => removeCategory(idx)} aria-label={`Remove ${c}`}>×</button></span>
                ))}
                <input
                  className="chip-input"
                  type="text"
                  value={adCatInput}
                  onChange={(e) => setAdCatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCategory(); } }}
                  placeholder="Type and press Enter"
                />
              </div>
              {upSubmitted && upErrors.categories && <div className="error-text">{upErrors.categories}</div>}
            </div>
          </div>

          <div className="field-row two">
            <div className="field">
              <label>.glb file (3D preview) <span className="req">*</span></label>
              <input className={`input-file ${upSubmitted && upErrors.glb ? 'input-error' : ''}`} type="file" accept=".glb,.GLB" onChange={(e)=>setUpGlb(e.target.files?.[0]||null)} />
              {upSubmitted && upErrors.glb && <div className="error-text">{upErrors.glb}</div>}
              {upGlb && <div className="file-meta">{upGlb.name} • {(upGlb.size/1024/1024).toFixed(2)} MB</div>}
            </div>
            <div className="field">
              <label>.mcstructure file <span className="req">*</span></label>
              <input className={`input-file ${upSubmitted && upErrors.mc ? 'input-error' : ''}`} type="file" accept=".mcstructure" onChange={(e)=>setUpMc(e.target.files?.[0]||null)} />
              {upSubmitted && upErrors.mc && <div className="error-text">{upErrors.mc}</div>}
              {upMc && <div className="file-meta">{upMc.name} • {(upMc.size/1024/1024).toFixed(2)} MB</div>}
              <div className="help">Required for in-game structure placement.</div>
            </div>
          </div>

          {(upMc || upMatLoading || upMatError || upMaterials.length>0) && (
            <div className="panel" style={{ marginTop: 12 }}>
              <div
                className="panel-head"
                role="button"
                tabIndex={0}
                onClick={() => setUpMaterialsOpen(o => !o)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUpMaterialsOpen(o => !o); } }}
                aria-expanded={upMaterialsOpen}
                aria-controls="admin-materials-panel"
              >
                <strong>Materials (preview)</strong>
                <span className="toggle-materials" aria-hidden="true" style={{ marginLeft: 'auto', pointerEvents: 'none' }}>
                  <i className={`fa-solid fa-chevron-right ${upMaterialsOpen ? 'is-open' : ''}`} aria-hidden="true"></i>
                </span>
              </div>

              <div id="admin-materials-panel" className={`panel-body ${upMaterialsOpen ? 'is-open' : ''}`} aria-hidden={!upMaterialsOpen}>
                {upMatLoading && <p className="muted">Analyzing .mcstructure…</p>}
                {!upMatLoading && upMatError && (
                  <p className="muted">{upMatError} The final list will be computed after upload.</p>
                )}
                {!upMatLoading && !upMatError && upMaterials.length === 0 && (
                  <p className="muted">No materials detected in this file.</p>
                )}
                {!upMatLoading && !upMatError && upMaterials.length>0 && (
                  <ul className="materials-list">
                    {upMaterials.map((m,i)=>{
                      const id = (m.icon||'').replace(/^minecraft:/,'');
                      const iconUrl = id ? `https://mc.nerothe.com/img/1.21.8/minecraft_${id}.png` : '';
                      return (
                        <li key={i} style={{ breakInside:'avoid', display:'flex', alignItems:'center', gap:8, lineHeight:1.3 }}>
                          {iconUrl && (
                            <img src={iconUrl} alt={m.itemname} width={20} height={20} loading="lazy"
                                 style={{ display:'inline-block', borderRadius:4, background:'rgba(0,0,0,0.06)' }}
                                 onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                          )}
                          <span style={{ flex:1 }}>{m.itemname}</span>
                          <span style={{ opacity:0.8 }}>× {m.amount}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* No credits input for admin uploads; credits are set automatically. */}

          <div className="field-row">
            <div className="field">
              <label>Holoprint (.mcpack) <span className="req">*</span></label>
              <input className={`input-file ${upSubmitted && upErrors.holoprint ? 'input-error' : ''}`} type="file" accept=".mcpack" onChange={(e)=>setUpHoloprint(e.target.files?.[0]||null)} />
              {upSubmitted && upErrors.holoprint && <div className="error-text">{upErrors.holoprint}</div>}
              {upHoloprint && <div className="file-meta">{upHoloprint.name} • {(upHoloprint.size/1024/1024).toFixed(2)} MB</div>}
            </div>
          </div>

          {/* Admin uploads are published automatically; no publish checkbox needed */}

          <div className="field-row">
            <button className="btn primary" type="submit" disabled={adminSubmitting} aria-busy={adminSubmitting}>
              {adminSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      {tab==='manage' && (
        <div className="panel">
          <div className="panel-head"><strong>Published builds</strong></div>
          {buildsLoading && (
            <div className="grid">
              {Array.from({length:6}).map((_,i)=> (
                <div key={i} className="model-card">
                  <div className="model-card-viewer skeleton skeleton-viewer" />
                  <div className="model-card-info">
                    <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                    <div className="skeleton skeleton-line" style={{ width: '40%', marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!buildsLoading && builds.length === 0 && <p className="muted">No builds yet.</p>}
          {!buildsLoading && builds.length > 0 && (
            <div className="grid fade-in">
              {builds.map((m) => (
                <div key={m.buildId || m.id}>
                  {/* Reuse ModelCard with a custom action */}
                  <ModelCard model={m} actionLabel="Remove" onAction={removeBuild} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='drafts' && (
        <div className="panel">
          <div className="panel-head"><strong>Draft builds (not yet on Discover)</strong></div>
          {draftsLoading && (
            <div className="grid">
              {Array.from({length:4}).map((_,i)=> (
                <div key={i} className="model-card">
                  <div className="model-card-viewer skeleton skeleton-viewer" />
                  <div className="model-card-info">
                    <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                    <div className="skeleton skeleton-line" style={{ width: '40%', marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!draftsLoading && drafts.length === 0 && <p className="muted">No drafts yet.</p>}
          {!draftsLoading && drafts.length > 0 && (
            <div className="grid fade-in">
              {drafts.map((b, idx) => (
                <div key={b.buildId || idx} className="model-card">
                  <div className="model-card-viewer">
                    <ModelViewer url={b.url} fitMargin={4.0} background={'var(--viewer-bg)'} ref={(el)=>{ if (el) viewerRefs.current[b.buildId] = el; }} />
                  </div>
                  <div className="model-card-info">
                    <div className="model-card-title">{b.name}</div>
                    {b.description && <div className="model-card-desc">{b.description}</div>}
                    {Array.isArray(b.categories) && b.categories.length>0 && (
                      <div className="tags">{b.categories.map((c,i)=><span key={i} className="tag">{c}</span>)}</div>
                    )}
                  </div>
                  <div className="model-card-actions" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {b.mcstructureUrl && <a className="btn" href={b.mcstructureUrl} download>Download .mcstructure</a>}
                    <label className="btn" style={{ position:'relative', overflow:'hidden' }}>
                      <input type="file" accept=".mcpack" style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }} onChange={async (e)=>{
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('holoprint', file);
                        await fetch(`${API_BASE}/api/admin/builds/${encodeURIComponent(b.buildId)}/holoprint`, { method: 'POST', credentials: 'include', body: fd });
                        loadDrafts();
                      }} />
                      Upload holoprint
                    </label>
                    <button className="btn" onClick={async ()=>{
                      const ref = viewerRefs.current[b.buildId];
                      if (!ref?.capture) return;
                      const blob = await ref.capture();
                      const fd = new FormData();
                      fd.append('preview', blob, `${b.id || b.buildId || 'preview'}.png`);
                      await fetch(`${API_BASE}/api/admin/builds/${encodeURIComponent(b.buildId)}/preview`, { method: 'POST', credentials: 'include', body: fd });
                      loadDrafts();
                    }}>Generate preview</button>
                    <button className="btn primary" disabled={!b.holoprintUrl} title={!b.holoprintUrl ? 'Upload holoprint first' : undefined} onClick={async ()=>{
                      await fetch(`${API_BASE}/api/admin/builds/${encodeURIComponent(b.buildId)}/ready`, { method: 'POST', credentials: 'include' });
                      // Move to Manage
                      setDrafts(prev => prev.filter(d => d.buildId !== b.buildId));
                    }}>Ready</button>
                    <button className="btn" onClick={()=>removeBuild(b)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
