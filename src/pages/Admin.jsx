import React, { useEffect, useRef, useState } from 'react';
import ModelViewer from '../components/ModelViewer';
import ModelCard from '../components/ModelCard';
import { useAuth } from '../context/AuthContext';
import NotFound from './NotFound';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export default function Admin() {
  const { user, loading } = useAuth();

  const [subs, setSubs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [tab, setTab] = useState('submissions');
  const [builds, setBuilds] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const viewerRefs = useRef({});

  useEffect(() => {
    if (!user?.isAdmin) return;
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
  }, [user]);

  const loadBuilds = async () => {
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
  };
  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === 'manage') loadBuilds();
    if (tab === 'drafts') loadDrafts();
  }, [user, tab]);

  const loadDrafts = async () => {
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

  // Credits (socials list) like public Upload
  const [upAuthor, setUpAuthor] = useState('');
  const [adSocials, setAdSocials] = useState([{ type: '', url: '' }]);
  const updateSocial = (idx, field, value) => {
    setAdSocials(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const addSocial = () => setAdSocials(prev => [...prev, { type: '', url: '' }]);
  const removeSocial = (idx) => setAdSocials(prev => prev.filter((_, i) => i !== idx));
  const [upGlb, setUpGlb] = useState(null);
  const [upMc, setUpMc] = useState(null);
  const [upMaterials, setUpMaterials] = useState([]);
  const [upMatLoading, setUpMatLoading] = useState(false);
  const [upMatError, setUpMatError] = useState('');
  const [aliasesMap, setAliasesMap] = useState({});
  const uploadDirect = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', upName);
    fd.append('description', upDesc);
    adCategories.forEach(c => fd.append('categories', c));
    if (upAuthor || adSocials.some(s => s.type || s.url)) {
      const socials = adSocials.filter(s => s.type || s.url);
      fd.append('credits', JSON.stringify({ author: upAuthor || undefined, socials }));
    }
    if (upGlb) fd.append('glb', upGlb);
    if (upMc) fd.append('mcstructure', upMc);
  await fetch(`${API_BASE}/api/admin/builds`, { method: 'POST', credentials: 'include', body: fd });
    setUpName(''); setUpDesc(''); setAdCategories([]); setAdCatInput(''); setUpAuthor(''); setAdSocials([{ type: '', url: '' }]); setUpGlb(null); setUpMc(null); setUpMaterials([]); setUpMatError('');
    alert('Build uploaded');
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
          <button className={`tab ${tab==='submissions'?'active':''}`} onClick={()=>setTab('submissions')}>Submissions</button>
          <button className={`tab ${tab==='drafts'?'active':''}`} onClick={()=>setTab('drafts')}>Drafts</button>
          <button className={`tab ${tab==='manage'?'active':''}`} onClick={()=>setTab('manage')}>Manage</button>
          <button className={`tab ${tab==='upload'?'active':''}`} onClick={()=>setTab('upload')}>Upload Build</button>
        </div>
      </div>

      {tab==='submissions' && (
        <div className="panel">
          <div className="panel-head"><strong>Pending submissions</strong></div>
          {adminLoading ? <p className="muted">Loading…</p> : (
            subs.length === 0 ? <p className="muted">No submissions.</p> : (
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
            )
          )}
        </div>
      )}

      {tab==='upload' && (
        <form onSubmit={uploadDirect} className="form-card">
          <div className="field-row">
            <div className="field">
              <label>Build name</label>
              <input className="input" type="text" value={upName} onChange={(e)=>setUpName(e.target.value)} placeholder="Ex: Medieval Watchtower" />
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
              <label>Categories</label>
              <div className="chips">
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
            </div>
          </div>

          <div className="field-row two">
            <div className="field">
              <label>.glb file (3D preview)</label>
              <input className="input-file" type="file" accept=".glb,.GLB" onChange={(e)=>setUpGlb(e.target.files?.[0]||null)} />
              {upGlb && <div className="file-meta">{upGlb.name} • {(upGlb.size/1024/1024).toFixed(2)} MB</div>}
            </div>
            <div className="field">
              <label>.mcstructure file</label>
              <input className="input-file" type="file" accept=".mcstructure" onChange={(e)=>setUpMc(e.target.files?.[0]||null)} />
              {upMc && <div className="file-meta">{upMc.name} • {(upMc.size/1024/1024).toFixed(2)} MB</div>}
              <div className="help">Required for in-game structure placement.</div>
            </div>
          </div>

          {(upMc || upMatLoading || upMatError || upMaterials.length>0) && (
            <div className="panel" style={{ marginTop: 12 }}>
              <div className="panel-head"><strong>Materials (preview)</strong></div>
              {upMatLoading && <p className="muted">Analyzing .mcstructure…</p>}
              {!upMatLoading && upMatError && (
                <p className="muted">{upMatError} The final list will be computed after upload.</p>
              )}
              {!upMatLoading && !upMatError && upMaterials.length === 0 && (
                <p className="muted">No materials detected in this file.</p>
              )}
              {!upMatLoading && !upMatError && upMaterials.length>0 && (
                <ul style={{ margin: 0, paddingLeft: 18, columns: 2, columnGap: 24 }}>
                  {upMaterials.map((m,i)=>{
                    const id = (m.icon||'').replace(/^minecraft:/,'');
                    const iconUrl = id ? `https://mc.nerothe.com/img/1.21.8/minecraft_${id}.png` : '';
                    return (
                      <li key={i} style={{ breakInside:'avoid', display:'flex', alignItems:'center', gap:8, lineHeight:1.3 }}>
                        {iconUrl && (
                          <img src={iconUrl} alt={m.itemname} width={18} height={18} loading="lazy"
                               style={{ display:'inline-block', background:'rgba(0,0,0,0.06)', borderRadius:3 }}
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
          )}

          <div className="panel" style={{ marginTop: 8 }}>
            <div className="panel-head">
              <strong>Credits</strong> <span className="muted">(optional)</span>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Author</label>
                <input className="input" value={upAuthor} onChange={(e)=>setUpAuthor(e.target.value)} placeholder="Creator name" />
              </div>
            </div>
            {adSocials.map((s, idx) => (
              <div className="field-row two" key={idx}>
                <div className="field">
                  <label>Platform</label>
                  <select className="input" value={s.type} onChange={(e) => updateSocial(idx, 'type', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitter">Twitter/X</option>
                    <option value="GitHub">GitHub</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Discord">Discord</option>
                    <option value="Link">Other/Link</option>
                  </select>
                </div>
                <div className="field">
                  <label>URL</label>
                  <input className="input" type="url" placeholder="https://..." value={s.url} onChange={(e) => updateSocial(idx, 'url', e.target.value)} />
                </div>
                <div className="field actions">
                  <button type="button" className="btn" onClick={() => removeSocial(idx)} aria-label="Remove social">Remove</button>
                </div>
              </div>
            ))}
            <div className="field-row">
              <button type="button" className="btn" onClick={addSocial}><i className="fa-solid fa-plus" aria-hidden="true"></i> Add social</button>
            </div>
          </div>

          <div className="field-row">
            <button className="btn primary" type="submit">Upload</button>
          </div>
        </form>
      )}

      {tab==='manage' && (
        <div className="panel">
          <div className="panel-head"><strong>Published builds</strong></div>
          {builds.length === 0 ? (
            <p className="muted">No builds yet.</p>
          ) : (
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
          {drafts.length === 0 ? (
            <p className="muted">No drafts yet.</p>
          ) : (
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
