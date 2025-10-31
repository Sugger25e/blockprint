import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useReloadableNavigate from '../utils/useReloadableNavigate';
import { useAuth } from '../context/AuthContext';
import ModelViewer from '../components/ModelViewer';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

const PRESET_CATEGORIES = ['Survival','Creative','Redstone','Farm','Adventure','Building','Decoration','Multiplayer','Hardcore','Mini-Game','Simple'];

export default function ManageEdit({ ownerMode = false }) {
  const { id } = useParams();
  const navigate = useReloadableNavigate();
  const { user, loading: authLoading } = useAuth();
  const [model, setModel] = useState(null);
  const [isSubmission, setIsSubmission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [glbFile, setGlbFile] = useState(null);
  const [mcFile, setMcFile] = useState(null);
  const [holoprintFile, setHoloprintFile] = useState(null);
  const [glbPreviewUrl, setGlbPreviewUrl] = useState(null);
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef(null);

  const viewerRef = useRef(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewUploading, setPreviewUploading] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrlLocal, setPreviewUrlLocal] = useState(null);
  const [previewTempUrl, setPreviewTempUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    // Fetch builds list and find build by numeric id or ObjectId
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (ownerMode) {
          // Owner mode: try to fetch a published build first, but fall back to a submission if not found
          let fetched = null;
          try {
            const res = await fetch(`${API_BASE}/api/my/builds/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              const found = data?.build || null;
              if (found) fetched = { type: 'build', data: found };
            }
          } catch (_) { /* ignore and try submission */ }

          if (!fetched) {
            // try submission path (pending submission owned by user)
            try {
              const res2 = await fetch(`${API_BASE}/api/my/submissions/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
              if (res2.ok) {
                const data2 = await res2.json();
                const found2 = data2?.submission || null;
                if (found2) fetched = { type: 'submission', data: found2 };
              }
            } catch (_) { /* ignore */ }
          }

          if (!fetched) throw new Error('Build not found');

          if (fetched.type === 'build') {
            const found = fetched.data;
            const normalized = {
              ...found,
              url: found.url?.startsWith('http') ? found.url : `${API_BASE}${found.url || ''}`,
              previewImage: found.previewImageUrl?.startsWith('http') ? found.previewImageUrl : (found.previewImage || (found.previewImageUrl ? `${API_BASE}${found.previewImageUrl}` : null)),
              credits: found.credits || {},
            };
            if (!cancelled) {
              setIsSubmission(false);
              setModel(normalized);
              setName(normalized.name || '');
              setDescription(normalized.description || '');
              setCategories(normalized.categories || []);
              initialRef.current = {
                name: normalized.name || '',
                description: normalized.description || '',
                categories: (normalized.categories || []).slice(),
                glbFile: null, mcFile: null, holoprintFile: null,
                previewImage: normalized.previewImage || null
              };
              setDirty(false);
            }
          } else {
            const found = fetched.data;
            const normalized = {
              // submission shape: id, numericId, name, description, categories, credits, glbUrl, mcstructureUrl, previewImage
              id: found.id,
              numericId: found.numericId || null,
              name: found.name,
              description: found.description,
              categories: found.categories || [],
              credits: found.credits || {},
              url: found.glbUrl?.startsWith('http') ? found.glbUrl : (found.glbUrl ? `${API_BASE}${found.glbUrl}` : null),
              previewImage: found.previewImage?.startsWith('http') ? found.previewImage : (found.previewImage ? `${API_BASE}${found.previewImage}` : null),
            };
            if (!cancelled) {
              setIsSubmission(true);
              setModel(normalized);
              setName(normalized.name || '');
              setDescription(normalized.description || '');
              setCategories(normalized.categories || []);
              initialRef.current = {
                name: normalized.name || '',
                description: normalized.description || '',
                categories: (normalized.categories || []).slice(),
                glbFile: null, mcFile: null, holoprintFile: null,
                previewImage: normalized.previewImage || null
              };
              setDirty(false);
            }
          }
        } else {
          // Admin mode: fetch builds list and find build by id
          const res = await fetch(`${API_BASE}/api/admin/builds`, { credentials: 'include', cache: 'no-store' });
          if (!res.ok) throw new Error('Failed to load builds list');
          const data = await res.json();
          const arr = Array.isArray(data?.builds) ? data.builds : [];
          let found = null;
          for (const b of arr) {
            if (String(b.buildId) === String(id) || String(b.id) === String(id)) { found = b; break; }
          }
          if (!found) throw new Error('Build not found');
          const normalized = {
            ...found,
            url: found.url?.startsWith('http') ? found.url : `${API_BASE}${found.url || ''}`,
            previewImage: found.previewImageUrl?.startsWith('http') ? found.previewImageUrl : (found.previewImageUrl ? `${API_BASE}${found.previewImageUrl}` : null),
            credits: found.credits || {},
          };
          if (!cancelled) {
            setModel(normalized);
            setName(normalized.name || '');
            setDescription(normalized.description || '');
            setCategories(normalized.categories || []);
            // store initial snapshot for dirty checks (include original preview image)
            initialRef.current = {
              name: normalized.name || '',
              description: normalized.description || '',
              categories: (normalized.categories || []).slice(),
              glbFile: null, mcFile: null, holoprintFile: null,
              previewImage: normalized.previewImage || null
            };
            setDirty(false);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not load build');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // warn user on page unload when there are unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    if (dirty) window.addEventListener('beforeunload', handler);
    return () => { window.removeEventListener('beforeunload', handler); };
  }, [dirty]);

  useEffect(() => {
    if (!glbFile) { setGlbPreviewUrl(null); return; }
    const url = URL.createObjectURL(glbFile);
    setGlbPreviewUrl(url);
    return () => { try { URL.revokeObjectURL(url); } catch {} };
  }, [glbFile]);

  // mark dirty when any editable field differs from initial snapshot
  useEffect(() => {
    const init = initialRef.current;
    if (!init) return setDirty(false);
    const changed = (
      name !== (init.name || '') ||
      description !== (init.description || '') ||
      JSON.stringify((categories||[]).slice().sort()) !== JSON.stringify((init.categories||[]).slice().sort()) ||
      !!glbFile || !!mcFile || !!holoprintFile || !!previewBlob
    );
    setDirty(changed);
  }, [name, description, categories, glbFile, mcFile, holoprintFile, previewBlob]);

  // show toast when dirty becomes true
  useEffect(() => {
    if (dirty) setToastVisible(true);
  }, [dirty]);

  // snackbar helper
  useEffect(() => {
    let t;
    if (snack.visible) {
      t = setTimeout(() => setSnack(s => ({ ...s, visible: false })), 3500);
    }
    return () => { try { clearTimeout(t); } catch {} };
  }, [snack.visible]);

  const showSnack = (message, type = 'info') => {
    setSnack({ visible: true, message: String(message || ''), type });
  };

  const toggleCategory = (val) => {
    if (categories.includes(val)) return setCategories(categories.filter(c => c !== val));
    if (categories.length >= 3) return;
    setCategories([...categories, val]);
  };

  const handleCapturePreview = async () => {
    if (!viewerRef.current || !viewerRef.current.capture) return;
    setPreviewGenerating(true);
    try {
      const blob = await viewerRef.current.capture({ quality: 1.0, scale: 2 });
      // keep locally until user presses Save
      setPreviewBlob(blob);
      try { URL.revokeObjectURL(previewUrlLocal); } catch {}
      const localUrl = URL.createObjectURL(blob);
      setPreviewUrlLocal(localUrl);
      // show the preview locally in the UI immediately
      setModel(m => m ? ({ ...m, previewImage: localUrl }) : m);

      // upload the generated preview as a temporary preview on the server
      try {
        const fd = new FormData();
        fd.append('preview', blob, `${id}-preview.png`);
        const previewTempEndpoint = ownerMode
          ? (isSubmission ? `${API_BASE}/api/my/submissions/${encodeURIComponent(id)}/preview-temp` : `${API_BASE}/api/my/builds/${encodeURIComponent(id)}/preview-temp`)
          : `${API_BASE}/api/admin/builds/${encodeURIComponent(id)}/preview-temp`;
        const res = await fetch(previewTempEndpoint, { method: 'POST', credentials: 'include', body: fd });
        if (!res.ok) throw new Error('Temp preview upload failed');
        const json = await res.json();
        const tempUrl = json?.tempPreviewUrl || null;
        if (tempUrl) {
          // replace local preview with server temp URL
          setPreviewTempUrl(tempUrl);
          setModel(m => m ? ({ ...m, previewImage: tempUrl }) : m);
          // revoke local object URL
          try { URL.revokeObjectURL(localUrl); } catch {}
          setPreviewUrlLocal(null);
        }
      } catch (e) {
        console.warn('Temp preview upload failed', e);
      }
    } catch (e) {
      console.error('Preview generation failed', e);
      showSnack('Failed to generate preview', 'error');
    } finally { setPreviewGenerating(false); }
  };

  const handleSave = async (e) => {
    e && e.preventDefault();
    if (!model) return;
    setSaving(true);
    try {
      // If a temp preview was uploaded, commit it (server has a tempPreviewUrl)
      if (previewTempUrl) {
        setPreviewUploading(true);
        try {
          const previewCommitEndpoint = ownerMode
            ? (isSubmission ? `${API_BASE}/api/my/submissions/${encodeURIComponent(model.id)}/preview` : `${API_BASE}/api/my/builds/${encodeURIComponent(model.buildId || model.id)}/preview`)
            : `${API_BASE}/api/admin/builds/${encodeURIComponent(model.buildId || model.id)}/preview`;
          const resPrev = await fetch(previewCommitEndpoint, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempPreviewUrl: previewTempUrl })
          });
          if (!resPrev.ok) {
            const txt = await resPrev.text().catch(()=>null);
            throw new Error(txt || 'Preview commit failed');
          }
          const prevJson = await resPrev.json();
          const newUrl = prevJson?.previewImageUrl || prevJson?.preview || prevJson?.previewUrl || null;
          if (newUrl) setModel(m => m ? ({ ...m, previewImage: newUrl }) : m);
          setPreviewTempUrl(null);
        } catch (errPrev) {
          console.error('Preview commit during save failed', errPrev);
          showSnack(errPrev?.message || 'Preview commit failed', 'error');
          setPreviewUploading(false);
          setSaving(false);
          return;
        } finally { setPreviewUploading(false); }
          } else if (previewBlob) {
        // fallback: no temp upload; upload the blob directly
        setPreviewUploading(true);
        try {
          const fdPrev = new FormData();
          fdPrev.append('preview', previewBlob, `${model.buildId || model.id}-preview.png`);
          const previewUploadEndpoint = ownerMode
            ? (isSubmission ? `${API_BASE}/api/my/submissions/${encodeURIComponent(model.id)}/preview` : `${API_BASE}/api/my/builds/${encodeURIComponent(model.buildId || model.id)}/preview`)
            : `${API_BASE}/api/admin/builds/${encodeURIComponent(model.buildId || model.id)}/preview`;
          const resPrev = await fetch(previewUploadEndpoint, { method: 'POST', credentials: 'include', body: fdPrev });
          if (!resPrev.ok) {
            const txt = await resPrev.text().catch(()=>null);
            throw new Error(txt || 'Preview upload failed');
          }
          const prevJson = await resPrev.json();
          const newUrl = prevJson?.previewImageUrl || prevJson?.preview || prevJson?.previewUrl || null;
          if (newUrl) setModel(m => m ? ({ ...m, previewImage: newUrl }) : m);
          try { URL.revokeObjectURL(previewUrlLocal); } catch {}
          setPreviewBlob(null); setPreviewUrlLocal(null);
        } catch (errPrev) {
          console.error('Preview upload during save failed', errPrev);
          showSnack(errPrev?.message || 'Preview upload failed', 'error');
          setPreviewUploading(false);
          setSaving(false);
          return;
        } finally { setPreviewUploading(false); }
      }

      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description || '');
      categories.forEach(c => fd.append('categories', c));
      // credits unchanged unless user modifies; keep existing credits
      if (model.credits) fd.append('credits', JSON.stringify(model.credits));
      if (glbFile) fd.append('glb', glbFile);
      if (mcFile) fd.append('mcstructure', mcFile);
      if (holoprintFile) fd.append('holoprint', holoprintFile);

  const patchEndpoint = ownerMode
    ? (isSubmission ? `${API_BASE}/api/my/submissions/${encodeURIComponent(model.id)}` : `${API_BASE}/api/my/builds/${encodeURIComponent(model.buildId || model.id)}`)
    : `${API_BASE}/api/admin/builds/${encodeURIComponent(model.buildId || model.id)}`;
  const res = await fetch(patchEndpoint, { method: 'PATCH', credentials: 'include', body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        throw new Error(txt || 'Save failed');
      }
      const data = await res.json();
      if (data?.build) {
        const updated = data.build;
        setModel(prev => ({ ...prev, ...updated }));
        // update initial snapshot so dirty becomes false (record current preview image)
        // compute normalized preview image URL from server response when available
        const normalizedPreview = (updated.previewImageUrl ? (updated.previewImageUrl.startsWith('http') ? updated.previewImageUrl : `${API_BASE}${updated.previewImageUrl}`) : (model && model.previewImage) ? model.previewImage : null);
        initialRef.current = {
          name: updated.name || name,
          description: updated.description || description,
          categories: (updated.categories || categories || []).slice(),
          glbFile: null, mcFile: null, holoprintFile: null,
          previewImage: normalizedPreview
        };
      } else if (data?.submission) {
        // PATCH to a submission returns the updated submission; normalize similarly
        const updated = data.submission;
        const normalized = {
          id: updated.id || updated._id || model.id,
          numericId: updated.numericId || model.numericId || null,
          name: updated.name || name,
          description: updated.description || description,
          categories: updated.categories || categories || [],
          credits: updated.credits || model.credits || {},
          url: updated.glbUrl?.startsWith('http') ? updated.glbUrl : (updated.glbUrl ? `${API_BASE}${updated.glbUrl}` : model.url),
          previewImage: updated.previewImagePath?.startsWith('http') ? updated.previewImagePath : (updated.previewImagePath ? `${API_BASE}${updated.previewImagePath}` : (model && model.previewImage) ? model.previewImage : null)
        };
        setModel(prev => ({ ...prev, ...normalized }));
        initialRef.current = {
          name: normalized.name || name,
          description: normalized.description || description,
          categories: (normalized.categories || categories || []).slice(),
          glbFile: null, mcFile: null, holoprintFile: null,
          previewImage: normalized.previewImage
        };
      }
  // clear staged files/preview state and mark clean
        setGlbFile(null); setMcFile(null); setHoloprintFile(null);
        setPreviewBlob(null); try { URL.revokeObjectURL(previewUrlLocal); } catch {} setPreviewUrlLocal(null); setPreviewTempUrl(null);
        setDirty(false);
        // animate toast close
        setToastClosing(true);
        setTimeout(() => { setToastClosing(false); setToastVisible(false); }, 320);
        showSnack('Saved', 'success');
    } catch (err) {
      console.error(err);
      showSnack(err?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this build from Discover? This action cannot be undone.')) return;
    try {
      setDeleting(true);
      const deleteEndpoint = ownerMode
        ? (isSubmission ? `${API_BASE}/api/my/submissions/${encodeURIComponent(model.id)}` : `${API_BASE}/api/my/builds/${encodeURIComponent(model.buildId || model.id)}`)
        : `${API_BASE}/api/admin/builds/${encodeURIComponent(model.buildId || model.id)}`;
      const res = await fetch(deleteEndpoint, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      // Redirect to profile/admin and show toast on the target page via location.state
      if (ownerMode) {
        navigate('/profile', { state: { toast: { message: 'Build deleted', type: 'success' } } });
      } else {
        navigate('/admin?tab=manage', { state: { toast: { message: 'Build deleted', type: 'success' } } });
      }
    } catch (e) {
      console.error(e);
      showSnack(e?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-line" style={{ width: 320, height: 22, borderRadius: 6, marginBottom: 6 }} />
          <div className="skeleton skeleton-line" style={{ width: 160, height: 14, borderRadius: 6 }} />
        </div>
      </div>

      <div className="form-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 12 }}>
          <div className="model-card-viewer skeleton skeleton-viewer" style={{ flex: 1 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton skeleton-viewer" style={{ height: 160 }} />
            <div className="skeleton skeleton-line" style={{ width: '40%' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton skeleton-line" style={{ width: '60%', height: 44 }} />
          <div className="skeleton skeleton-text" style={{ width: '100%', height: 80 }} />
          <div className="skeleton skeleton-line" style={{ width: '70%', height: 40 }} />
          <div className="skeleton skeleton-line" style={{ width: '40%', height: 44 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ height: 40, width: 120, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 40, width: 120, borderRadius: 6 }} />
          </div>
        </div>
      </div>
    </div>
  );
  if (error) return <div className="page"><p className="muted">{error}</p></div>;
  if (!model) return <div className="page"><p className="muted">No model data.</p></div>;

  const author = typeof model.credits === 'string' ? model.credits : model.credits?.author;
  const avatar = model.credits?.avatarUrl;

  return (
    <div className="page admin-page">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <button className="btn" onClick={() => {
          if (dirty) {
              if (!window.confirm('You have unsaved changes. Leave without saving?')) return;
            }
            if (ownerMode) navigate(`/profile`); else navigate('/admin?tab=manage');
  }}>{ownerMode ? '← Back to Profile' : '← Back to Manage'}</button>
        <h2 style={{ margin: 0 }}>Edit: {model.name}</h2>
      </div>

      <form className="form-card" onSubmit={handleSave}>
        <div className="field-row">
          <div className="field">
            <label>Build name <span className="req">*</span></label>
            <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Tags <span className="req">*</span></label>
            <div className="chips">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_CATEGORIES.map((opt) => (
                  <button key={opt} type="button" onClick={() => toggleCategory(opt)} className={`btn ${categories.includes(opt) ? 'primary' : ''}`} style={{ padding: '6px 10px', borderRadius: 999 }}>
                    {opt}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8 }} className="help">Select up to 3 categories</div>
            </div>
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
                  <ModelViewer url={glbPreviewUrl || model.url} fitMargin={4.0} background={'var(--viewer-bg)'} ref={(el)=>{ if (el) viewerRef.current = el; }} style={{ width: '100%', height: '100%' }} />
                </div>

                {/* Right: preview area - take half the width */}
                <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    { (previewUrlLocal || model.previewImage) ? (
                      <img src={previewUrlLocal || model.previewImage} alt="Preview" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    ) : (
                      <div className="muted" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px dashed var(--border)' }}>No preview</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn" onClick={handleCapturePreview} disabled={previewGenerating}>{previewGenerating ? 'Generating…' : 'Generate preview image'}</button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ previewUrlLocal ? 'Unsaved' : (model.previewImage ? 'Saved' : '') }</div>
                  </div>
                </div>
              </div>
              {/* Responsive fallback: on narrow screens stack visually via CSS (keeps inline styles simple) */}
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>.mcstructure file</label>
            <input type="file" accept=".mcstructure" onChange={(e)=>setMcFile(e.target.files?.[0]||null)} />
            {mcFile && <div className="file-meta">{mcFile.name} • {(mcFile.size/1024/1024).toFixed(2)} MB</div>}
            <div className="help">Required for in-game structure placement.</div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Holoprint (.mcpack)</label>
            <input type="file" accept=".mcpack" onChange={(e)=>setHoloprintFile(e.target.files?.[0]||null)} />
            {holoprintFile && <div className="file-meta">{holoprintFile.name} • {(holoprintFile.size/1024/1024).toFixed(2)} MB</div>}
          </div>
        </div>

        {/* Delete button placed at the very bottom after holoprint */}
        <div className="field-row">
          <div className="field actions">
            <button type="button" className="btn danger" onClick={handleDelete} disabled={deleting} aria-busy={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>

        {/* Persistent unsaved-changes toast (centered, buttons below text) */}
        {toastVisible && (
          <div className={`unsaved-toast ${toastClosing ? 'closing' : 'open'}`} role="status" aria-live="polite">
            <div className="unsaved-text">You have unsaved changes</div>
            <div className="unsaved-actions" style={{ display: 'flex', gap: 8, marginTop: 8, flexDirection: 'column', width: '100%' }}>
              <button type="button" className="btn primary" onClick={handleSave} disabled={saving || previewUploading}>{(saving || previewUploading) ? 'Saving…' : 'Save changes'}</button>
              <button type="button" className="btn" disabled={saving || previewUploading || previewGenerating} onClick={(e) => {
                e.preventDefault();
                // animate close then reset to initial snapshot
                setToastClosing(true);
                setTimeout(() => {
                  (async () => {
                    setToastClosing(false);
                    setToastVisible(false);
                    const init = initialRef.current || {};
                    setName(init.name || '');
                    setDescription(init.description || '');
                    setCategories((init.categories||[]).slice());
                    setGlbFile(null); setMcFile(null); setHoloprintFile(null);
                    // restore original preview image (before any generated local preview)
                    if (init.previewImage) {
                      setModel(m => m ? ({ ...m, previewImage: init.previewImage }) : m);
                    } else {
                      // fallback: re-fetch the build or submission to get the server preview URL
                      try {
                        if (ownerMode) {
                          if (isSubmission) {
                            const res = await fetch(`${API_BASE}/api/my/submissions/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
                            if (res.ok) {
                              const data = await res.json();
                              const found = data?.submission || null;
                              if (found) {
                                const preview = found.previewImage?.startsWith('http') ? found.previewImage : (found.previewImage ? `${API_BASE}${found.previewImage}` : null);
                                setModel(m => m ? ({ ...m, previewImage: preview }) : m);
                                initialRef.current = { ...(initialRef.current || {}), previewImage: preview || null };
                              }
                            }
                          } else {
                            const res = await fetch(`${API_BASE}/api/my/builds/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
                            if (res.ok) {
                              const data = await res.json();
                              const found = data?.build || null;
                              if (found) {
                                const preview = found.previewImageUrl?.startsWith('http') ? found.previewImageUrl : (found.previewImage || (found.previewImageUrl ? `${API_BASE}${found.previewImageUrl}` : null));
                                setModel(m => m ? ({ ...m, previewImage: preview }) : m);
                                initialRef.current = { ...(initialRef.current || {}), previewImage: preview || null };
                              }
                            }
                          }
                        } else {
                          const res = await fetch(`${API_BASE}/api/admin/builds`, { credentials: 'include', cache: 'no-store' });
                          if (res.ok) {
                            const data = await res.json();
                            const arr = Array.isArray(data?.builds) ? data.builds : [];
                            const found = arr.find(b => String(b.buildId) === String(id) || String(b.id) === String(id));
                            if (found) {
                              const preview = found.previewImageUrl?.startsWith('http') ? found.previewImageUrl : (found.previewImageUrl ? `${API_BASE}${found.previewImageUrl}` : null);
                              setModel(m => m ? ({ ...m, previewImage: preview }) : m);
                              initialRef.current = { ...(initialRef.current || {}), previewImage: preview || null };
                            }
                          }
                        }
                      } catch (e) { /* ignore */ }
                    }
                    // if a temp preview was uploaded to the server, delete it now
                    if (previewTempUrl) {
                      try {
                        const previewTempDelete = ownerMode
                          ? (isSubmission ? `${API_BASE}/api/my/submissions/${encodeURIComponent(id)}/preview-temp` : `${API_BASE}/api/my/builds/${encodeURIComponent(id)}/preview-temp`)
                          : `${API_BASE}/api/admin/builds/${encodeURIComponent(id)}/preview-temp`;
                        await fetch(previewTempDelete, {
                          method: 'DELETE',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tempPreviewUrl: previewTempUrl })
                        });
                      } catch (e) {
                        console.warn('Failed to delete temp preview on reset', e);
                      }
                      setPreviewTempUrl(null);
                    }
                    // cleanup local preview
                    try { URL.revokeObjectURL(previewUrlLocal); } catch {}
                    setPreviewBlob(null); setPreviewUrlLocal(null);
                  })();
                }, 320);
              }}>Reset</button>
            </div>
          </div>
        )}

      </form>
      {/* Snackbar for transient messages */}
      {snack.visible && (
        <div className={`snackbar ${snack.type || 'info'}`} role="status" aria-live="polite">{snack.message}</div>
      )}
    </div>
  );
}
