import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useModels } from '../context/ModelsContext';
import ModelViewer from '../components/ModelViewer';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/UiContext';
import { getBuildStats, toggleLike as apiToggleLike, toggleFavorite as apiToggleFavorite, getComments as apiGetComments, postComment as apiPostComment, editComment as apiEditComment, deleteComment as apiDeleteComment, recordDownload as apiRecordDownload } from '../utils/modelActions';

function MaterialRow({ mat }) {
  const icon = typeof mat.icon === 'string' ? mat.icon : '';
  const itemname = mat.itemname || mat.name || '';
  let iconUrl = icon;
  if (icon.startsWith('minecraft:')) {
    const id = icon.split(':')[1];
    iconUrl = `https://mc.nerothe.com/img/1.21.8/minecraft_${id}.png`;
  }
  const hasIcon = !!iconUrl;
  const [imgDone, setImgDone] = useState(!hasIcon);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!hasIcon) return;
    const imgEl = imgRef.current;
    let timeoutId;
    if (imgEl && imgEl.complete) {
      setImgDone(true);
    } else {
      timeoutId = setTimeout(() => setImgDone(true), 5000);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [hasIcon]);

  return (
    <li>
      <span className="mat-left">
        {hasIcon && (
          <>
            {!imgDone && <span className="skeleton skeleton-icon" aria-hidden="true" />}
            <img
              className="mat-icon"
              src={iconUrl}
              alt={itemname}
              loading="lazy"
              ref={imgRef}
              style={{ display: imgDone ? 'block' : 'none' }}
              onLoad={() => setImgDone(true)}
              onError={() => setImgDone(true)}
            />
          </>
        )}
        {hasIcon && !imgDone ? (
          <span className="skeleton skeleton-text" aria-hidden="true" />
        ) : (
          <span className="mat-name">{itemname}</span>
        )}
      </span>
      {hasIcon && !imgDone ? (
        <span className="skeleton skeleton-amount" aria-hidden="true" />
      ) : (
        mat.amount != null && <span className="mat-amount">× {mat.amount}</span>
      )}
    </li>
  );
}

export default function ModelDetail() {
  const { id } = useParams();
  const { models, loading: modelsLoading } = useModels();
  const idNum = Number(id);
  const model = models.find((m) => Number(m.id) === idNum);
  const [ogImage, setOgImage] = useState(null);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [ambientIntensity, setAmbientIntensity] = useState(4.5);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef(null);
  const bubbleRef = useRef(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [likeCount, setLikeCount] = useState(null);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [downloadCount, setDownloadCount] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [dimsLoading, setDimsLoading] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [favPulse, setFavPulse] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const composerRef = useRef(null);
  const editRef = useRef(null);
  const hcaptchaWidgetIdRef = useRef(null);
  const modalHcaptchaContainerRef = useRef(null);
  const pendingCommentRef = useRef(null);
  const [showCaptchaDialog, setShowCaptchaDialog] = useState(false);
  const HCAPTCHA_SITEKEY = process.env.REACT_APP_HCAPTCHA_SITEKEY;

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
    s.onload = () => {
      // no-op; widget will be rendered on demand when user posts
    };
    s.onerror = () => {
      console.error('Failed to load hcaptcha script');
    };
    document.head.appendChild(s);
    return () => { /* keep script for reuse */ };
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
      // if there's already a widget id, don't re-render
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
    // Try immediately, and poll briefly if script not yet loaded
    tryRender();
    const poll = setInterval(tryRender, 300);
    const to = setTimeout(() => clearInterval(poll), 5000);
    return () => { mounted = false; clearInterval(poll); clearTimeout(to); };
  }, [HCAPTCHA_SITEKEY, showCaptchaDialog]);

  useEffect(() => {
    // auto-resize composer textarea on mount/update
    if (composerRef.current) {
      const el = composerRef.current;
      el.style.height = 'auto';
      el.style.height = (el.scrollHeight) + 'px';
    }
  }, [commentText]);

  useEffect(() => {
    if (editRef.current) {
      const el = editRef.current;
      el.style.height = 'auto';
      el.style.height = (el.scrollHeight) + 'px';
    }
  }, [editingText, editingId]);

  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
  }

  useEffect(() => {
    if (!model) return;
    let timeout = setTimeout(() => {
      try {
        const wrap = document.querySelector('.detail-viewer');
        const canvas = wrap ? wrap.querySelector('canvas') : null;
        if (canvas && typeof canvas.toDataURL === 'function') {
          const url = canvas.toDataURL('image/png', 0.92);
          if (url && url.startsWith('data:image')) {
            setOgImage(url);
            return;
          }
        }
      } catch (_) {}
      try {
        const w = 1200, h = 630;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Segoe UI, Roboto, Arial, sans-serif';
        const title = (model.name || 'Blockprint Build').slice(0, 40);
        ctx.fillText(title, 60, 200);
        ctx.font = '28px Segoe UI, Roboto, Arial, sans-serif';
        const desc = (model.description || '').slice(0, 140);
        wrapText(ctx, desc, 60, 260, w - 120, 36);
        const author = model.credits?.author ? `by ${model.credits.author}` : '';
        ctx.font = 'bold 28px Segoe UI, Roboto, Arial, sans-serif';
        ctx.fillText(author, 60, h - 120);
        ctx.font = 'bold 32px Segoe UI, Roboto, Arial, sans-serif';
        ctx.fillText('Blockprint', 60, h - 60);
        setOgImage(c.toDataURL('image/png'));
      } catch (_) {}
    }, 1400);
    return () => clearTimeout(timeout);
  }, [model]);

  // Fetch and compute build dimensions (length x width x height) from .mcstructure if available
  useEffect(() => {
    if (!model) return;
    let cancelled = false;
    (async () => {
      try {
        const structUrl = model?.details?.structureUrl || model?.details?.mcstructureUrl || null;
        if (!structUrl) return;
        setDimsLoading(true);
        const res = await fetch(structUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const ab = await res.arrayBuffer();
        // dynamic import the same NBT parser used in Upload.jsx
        const NBT = await (0)('import("https://esm.sh/nbtify-readonly-typeless@1.1.2?keep-names")');
        let nbtRaw;
        try {
          const r = await NBT.read(ab, { endian: 'little', strict: false });
          nbtRaw = r?.data || r;
        } catch (e) {
          const r2 = await NBT.read(ab);
          nbtRaw = r2?.data || r2;
        }
        if (cancelled) return;

        // Helpers (lightweight, adapted from server utility)
        const numericObjectToArray = (maybeObj) => {
          if (!maybeObj) return [];
          if (Array.isArray(maybeObj)) return maybeObj.slice();
          if (typeof maybeObj === 'object') {
            const keys = Object.keys(maybeObj).map(k => Number(k)).filter(n => Number.isFinite(n)).sort((a,b)=>a-b);
            return keys.map(k => maybeObj[String(k)]);
          }
          return [maybeObj];
        };
        const getRoot = (nbt) => nbt?.data || nbt;
        const getBlockPositionData = (root) => (
          root?.structure?.palette?.default?.block_position_data ||
          root?.structure?.palette?.block_position_data ||
          root?.block_position_data ||
          null
        );
        const getBlockIndices = (root) => {
          const bi = root?.structure?.block_indices ?? root?.block_indices ?? root?.structure?.indices ?? null;
          if (!bi) return [];
          const layers = Array.isArray(bi) ? bi : [bi];
          const out = [];
          for (const layer of layers) {
            const arr = numericObjectToArray(layer);
            for (const v of arr) out.push(v);
          }
          return out;
        };
        const parsePosition = (key, entry) => {
          const posArr = entry?.pos || entry?.position || entry?.Pos || null;
          if (Array.isArray(posArr) && posArr.length >= 3) return [Number(posArr[0]), Number(posArr[1]), Number(posArr[2])];
          if (typeof key === 'string' && key.includes(',')) {
            const parts = key.split(',').map(s => Number(s.trim()));
            if (parts.length >= 3 && parts.every(Number.isFinite)) return parts.slice(0,3);
          }
          if (entry && typeof entry === 'object') {
            const maybe = [entry[0], entry[1], entry[2]];
            if (maybe.every(v => typeof v === 'number')) return maybe.map(Number);
          }
          return null;
        };
        const computeDimensions = (root) => {
          // 1) try explicit size
          const sizeRaw = root?.structure?.size || root?.size || null;
          if (sizeRaw) {
            const arr = numericObjectToArray(sizeRaw).map(Number);
            if (arr.length >= 3 && arr.slice(0,3).every(Number.isFinite)) {
              const x = arr[0], y = arr[1], z = arr[2];
              return { length: Math.abs(x), width: Math.abs(z), height: Math.abs(y) };
            }
          }
          // 2) infer from block_position_data
          const bp = getBlockPositionData(root) || {};
          let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, minZ=Infinity, maxZ=-Infinity;
          let found = false;
          for (const k of Object.keys(bp)) {
            const entry = bp[k];
            const pos = parsePosition(k, entry);
            if (!pos) continue;
            const [x,y,z] = pos.map(Number);
            if (![x,y,z].every(Number.isFinite)) continue;
            found = true;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
          }
          if (found) {
            const length = Math.abs(maxX - minX) + 1;
            const height = Math.abs(maxY - minY) + 1;
            const width = Math.abs(maxZ - minZ) + 1;
            return { length, width, height };
          }
          // 3) fallback: if block_indices exist, use layers as height
          const bi = getBlockIndices(root);
          if (bi && bi.length > 0) return { length: 0, width: 0, height: bi.length };
          return { length: 0, width: 0, height: 0 };
        };
        const root = getRoot(nbtRaw);
        const dims = computeDimensions(root || {});
        if (!cancelled) setDimensions(dims);
      } catch (e) {
        // ignore parse errors
      } finally {
        if (!cancelled) setDimsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [model]);

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = (text || '').split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  useEffect(() => {
    if (!model) return;
    // Title: show "Name by Author" when author exists, otherwise just the name
    const author = model.credits?.author || undefined;
    const title = author ? `${model.name} by ${author}` : model.name;

    // Description: use provided description or a clear placeholder
    const desc = (model.description && String(model.description).trim()) ? model.description : 'no description provided';

    // Prefer an explicit preview image from the model (server-provided) first.
    // Fallback to the generated ogImage (canvas) only if no preview image exists.
    const previewImg = model.previewImage || model.previewImageUrl || null;
    const image = previewImg || ogImage || null;

    const url = typeof window !== 'undefined' ? window.location.href : undefined;

    document.title = title;
    setNamedMeta('description', desc);
    if (author) setNamedMeta('author', author);
    setNamedMeta('theme-color', '#3b82f6');

    // Open Graph / Twitter cards
    setOG('og:title', title);
    setOG('og:description', desc);
    setOG('og:site_name', 'Blockprint');
    setOG('og:type', 'website');
    if (url) setOG('og:url', url);
    // Only set og:image/twitter:image if we have a preview image or generated image.
    if (image) {
      setOG('og:image', image);
      setTwitter('twitter:image', image);
    }

    setTwitter('twitter:card', 'summary_large_image');
    setTwitter('twitter:title', title);
    setTwitter('twitter:description', desc);
  }, [model, ogImage]);

  // fetch stats and comments for this model
  useEffect(() => {
    if (!model) return;
    let cancelled = false;
    (async () => {
      try {
        const stats = await getBuildStats(model.id);
        if (!cancelled && stats) {
          setLikeCount(typeof stats.likeCount === 'number' ? stats.likeCount : null);
          setLiked(!!stats.liked);
          setFavorited(!!stats.favorited);
          // support several possible stat property names for downloads
          const d = typeof stats.downloadCount === 'number' ? stats.downloadCount : (typeof stats.downloads === 'number' ? stats.downloads : (typeof stats.download === 'number' ? stats.download : null));
          setDownloadCount(d != null ? d : null);
        }
      } catch (_) {}
      try {
        const cRes = await apiGetComments(model.id);
        if (!cancelled && cRes?.comments) setComments(cRes.comments || []);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [model]);

  function setNamedMeta(name, content) {
    if (!content) return;
    let el = document.querySelector(`meta[name="${CSS.escape(name)}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', String(content));
  }
  function setOG(property, content) {
    if (!content) return;
    let el = document.querySelector(`meta[property="${CSS.escape(property)}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', String(content));
  }
  function setTwitter(name, content) {
    if (!content) return;
    let el = document.querySelector(`meta[name="${CSS.escape(name)}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', String(content));
  }

  async function downloadHoloprint(url, filename) {
    // Record download when user presses the button (best-effort).
    try {
      setDownloadCount(prev => (typeof prev === 'number' ? prev + 1 : 1));
      apiRecordDownload(model.id).catch(() => {});
    } catch (_) {}
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename || 'holoprint.mcpack';
      document.body.appendChild(a);
      a.click();
  try { showToast('Holoprint download started', 'success'); } catch (e) {}
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (_e) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
  try { showToast('Opened holoprint in a new tab', 'success'); } catch (e) {}
      } catch (_) {}
    }
  }

  // Position and toggle holoprint info bubble for mobile so it appears below the info icon
  useEffect(() => {
    const bubble = bubbleRef.current;
    const infoEl = infoRef.current;
    if (!bubble || !infoEl) return;

    function positionBubble() {
      const rect = infoEl.getBoundingClientRect();
      // Only apply explicit viewport coordinates on small screens where we use fixed positioning
      if (window.innerWidth <= 600) {
        // place bubble centered horizontally on the info icon and just below it
        const desiredCenter = rect.left + rect.width / 2;
        const bubbleW = bubble.offsetWidth || bubble.getBoundingClientRect().width || 320;
        const half = bubbleW / 2;
        const margin = 16; // minimum distance from the viewport edge
        const minCenter = margin + half;
        const maxCenter = window.innerWidth - margin - half;
        const center = Math.max(minCenter, Math.min(maxCenter, desiredCenter));
        const top = rect.bottom + 8; // 8px gap
        bubble.style.left = center + 'px';
        bubble.style.top = top + 'px';
        // keep translateX(-50%) so left represents the center
        bubble.style.transform = 'translateX(-50%) translateY(0)';
      } else {
        // remove inline positioning so CSS absolute placement takes over on larger screens
        bubble.style.left = '';
        bubble.style.top = '';
        bubble.style.transform = '';
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') setInfoOpen(false);
    }

    function onDocClick(e) {
      if (!infoEl.contains(e.target) && !bubble.contains(e.target)) setInfoOpen(false);
    }

    if (infoOpen) {
      // show and position
      bubble.style.visibility = 'visible';
      bubble.style.opacity = '1';
      bubble.style.pointerEvents = 'auto';
      positionBubble();
      window.addEventListener('resize', positionBubble);
      window.addEventListener('scroll', positionBubble, true);
      document.addEventListener('click', onDocClick);
      document.addEventListener('keydown', onKey);
    } else {
      bubble.style.visibility = 'hidden';
      bubble.style.opacity = '0';
      bubble.style.pointerEvents = 'none';
      window.removeEventListener('resize', positionBubble);
      window.removeEventListener('scroll', positionBubble, true);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    }

    return () => {
      window.removeEventListener('resize', positionBubble);
      window.removeEventListener('scroll', positionBubble, true);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [infoOpen]);

  function suggestFileName(m) {
    const base = (m?.name || 'holoprint').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    return `${base}.holoprint.mcpack`;
  }

  if (!model) {
    // If models are still loading, show skeleton placeholders instead of the "not found" state
    if (modelsLoading) {
      return (
        <div className="detail" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
          <div className="detail-header">
            <button className="back-btn" onClick={(e)=>{ e.preventDefault(); const params = new URLSearchParams(location.search); if (params.get('from') === 'profile') return navigate('/profile'); return navigate(-1); }}><i className="fa-solid fa-arrow-left"></i><span>Back</span></button>
            <h2>Loading…</h2>
          </div>
          <div className="detail-layout" style={{ gap: 32 }}>
            <div>
              <div className="detail-viewer" style={{ borderRadius: 12, overflow: 'hidden' }}>
                <div className="skeleton skeleton-viewer" style={{ height: '70vh' }} aria-hidden="true" />
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="skeleton skeleton-line" style={{ width: '60%' }} aria-hidden="true" />
                <div className="skeleton skeleton-line" style={{ width: '80%', marginTop: 8 }} aria-hidden="true" />
                <div className="skeleton skeleton-line" style={{ width: '40%', marginTop: 8 }} aria-hidden="true" />
              </div>
            </div>
            <aside>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: 56 }} aria-hidden="true" />
              <div style={{ marginTop: 12 }}>
                <div className="skeleton skeleton-line" style={{ width: '100%' }} aria-hidden="true" />
                <div className="skeleton skeleton-line" style={{ width: '90%', marginTop: 8 }} aria-hidden="true" />
                <div className="skeleton skeleton-line" style={{ width: '70%', marginTop: 8 }} aria-hidden="true" />
              </div>
            </aside>
          </div>
        </div>
      );
    }

    return (
      <div className="detail" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div className="detail-header">
          <button className="back-btn" onClick={(e)=>{ e.preventDefault(); const params = new URLSearchParams(location.search); if (params.get('from') === 'profile') return navigate('/profile'); return navigate(-1); }}><i className="fa-solid fa-arrow-left"></i><span>Back</span></button>
          <h2>Model</h2>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😵‍💫</div>
            <h3 style={{ margin: '0 0 8px' }}>We couldn’t find that model</h3>
            <p className="muted" style={{ maxWidth: 560, margin: '0 auto' }}>
              It may have been removed or isn’t published yet. Try going back or visiting the Discover page.
            </p>
            <div style={{ marginTop: 16 }}>
              <a className="btn" href="/">Back to Discover</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const materials = Array.isArray(model.materials) ? model.materials : [];
  const showCollapse = materials.length > 8;
  const visibleMaterials = showCollapse && !materialsExpanded ? materials.slice(0, 8) : materials;
  const hiddenCount = materials.length - 8;

  return (
    <div className="detail" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="detail-header">
        <button className="back-btn" onClick={(e)=>{ e.preventDefault(); const params = new URLSearchParams(location.search); if (params.get('from') === 'profile') return navigate('/profile'); return navigate(-1); }}><i className="fa-solid fa-arrow-left"></i><span>Back</span></button>
        <h2 title={model.name}>{model.name}</h2>
      </div>

<div className="detail-layout" style={{ gap: 32 }}>
  {/* Left column */}
  <div className="detail-left" style={{ display: 'flex', flexDirection: 'column' }}>
    {/* Model viewer box */}
    <div className="detail-viewer" style={{ borderRadius: 12, overflow: 'hidden' }}>
      <ModelViewer
        url={model.url}
        allowZoom
            ambientIntensity={ambientIntensity}
        modelId={model.id}
        showGrid={true}
      />
      {/* viewer overlay controls (like / favorite) placed top-right */}
      <div className="viewer-controls" aria-hidden={false}>
        <button
          className={`icon-btn ${heartPulse ? 'pop-anim' : ''}`}
          onClick={async (e) => {
            e.stopPropagation();
              if (!user) { showToast('Please log in to like models'); return; }
            try {
              setHeartPulse(true);
              const res = await apiToggleLike(model.id);
              if (res) {
                setLiked(!!res.liked);
                setLikeCount(typeof res.likeCount === 'number' ? res.likeCount : likeCount);
                try { showToast(res.liked ? 'Liked this model' : 'Removed like'); } catch {}
              }
            } catch (_) {}
            setTimeout(() => setHeartPulse(false), 420);
          }}
          aria-label={liked ? 'Unlike' : 'Like'}
          title={liked ? 'Unlike' : 'Like'}
        >
          <i className={`fa-solid fa-heart icon-heart ${liked ? 'active' : ''}`} aria-hidden="true"></i>
        </button>

        <button
          className={`icon-btn ${favPulse ? 'pop-anim' : ''}`}
          onClick={async (e) => {
            e.stopPropagation();
              if (!user) { showToast('Please log in to favorite models'); return; }
            try {
              setFavPulse(true);
              const res = await apiToggleFavorite(model.id);
              if (res) setFavorited(!!res.favorited);
              try { showToast(res.favorited ? 'Added to favorites' : 'Removed from favorites'); } catch {}
            } catch (_) {}
            setTimeout(() => setFavPulse(false), 420);
          }}
          aria-label={favorited ? 'Remove favorite' : 'Add to favorites'}
          title={favorited ? 'Remove favorite' : 'Add to favorites'}
        >
          <i className={`fa-solid fa-star icon-star ${favorited ? 'active' : ''}`} aria-hidden="true"></i>
        </button>
      </div>

      {(typeof likeCount === 'number' || typeof downloadCount === 'number') && (
        <div className="viewer-like-badge" aria-hidden="true" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {typeof likeCount === 'number' && (
            <span title={`${likeCount} likes`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <i className="fa-solid fa-heart" style={{ color: '#ef4444', fontSize: 13 }} aria-hidden="true"></i>
              <span style={{ fontSize: 13 }}>{likeCount}</span>
            </span>
          )}
          {typeof downloadCount === 'number' && (
            <span title={`${downloadCount} downloads`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <i className="fa-solid fa-download" style={{ color: 'var(--muted)', fontSize: 13 }} aria-hidden="true"></i>
              <span style={{ fontSize: 13 }}>{downloadCount}</span>
            </span>
          )}
        </div>
      )}
    </div>

    {/* Holoprint and credits outside the box */}
        <div style={{ marginTop: 16 }}>
          {/* Ambient intensity control */}
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Ambient light</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min={0}
                max={8}
                step={0.1}
                value={ambientIntensity}
                onChange={(e) => setAmbientIntensity(Number(e.target.value))}
                aria-label="Ambient light intensity"
              />
              <div style={{ minWidth: 48, textAlign: 'right', color: 'var(--muted)' }}>{ambientIntensity.toFixed(1)}</div>
            </div>
          </div>
      {/* Holoprint */}
      <div className="holoprint">
        <h3 className={`holoprint-title ${infoOpen ? 'is-open' : ''}`}>
          Holoprint <span
            className="info"
            tabIndex={0}
            ref={infoRef}
            onClick={(e) => { e.stopPropagation(); setInfoOpen(s => !s); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInfoOpen(s => !s); } }}
            aria-expanded={infoOpen}
            aria-controls="holoprint-info"
          ><i className="fa-solid fa-circle-info" aria-hidden="true"></i><span className="sr-only">Info</span></span>
          <span id="holoprint-info" ref={bubbleRef} className="info-bubble" role="dialog" aria-hidden={!infoOpen}>A resource pack that displays a hologram of this build in your world to guide construction.</span>
        </h3>
        <div className="actions">
          {model.holoprintUrl ? (
            <button className="btn primary" onClick={() => downloadHoloprint(model.holoprintUrl, suggestFileName(model))}>
              Download Holoprint
            </button>
          ) : (
            <button className="btn" disabled>Download Holoprint</button>
          )}
        </div>
      </div>

      {/* Credits */}
      {model.credits && (
              <div className="credits" style={{ marginTop: 12 }}>
                <h3>Credits</h3>
                {typeof model.credits === 'string' ? (
                  <p className="muted credits-row">{model.credits}</p>
                ) : (
                  <div className="credits-row">
                    {model.credits.author && (
                      <div className="author" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {model.credits.avatarUrl ? (
                          <img src={model.credits.avatarUrl} alt="Author avatar" width={28} height={28} style={{ borderRadius: '50%' }} />
                        ) : (
                          <span className="avatar-initial-primary" aria-hidden="true">{String(model.credits.author || '').charAt(0).toUpperCase() || '?'}</span>
                        )}
                        <span className="author-label">Author:</span>
                        <a
                          className="author-name"
                          href={`/user/${encodeURIComponent(String(model.credits.author || ''))}`}
                          onClick={(e) => { e.preventDefault(); try { navigate(`/user/${encodeURIComponent(String(model.credits.author || ''))}`); } catch (_) {} }}
                        >
                          {model.credits.author}
                        </a>
                      </div>
                    )}
                    {Array.isArray(model.credits.socials) && model.credits.socials.length > 0 && (
                      <div className="social-icons" aria-label="Author socials">
                        {model.credits.socials.map((s, idx) => {
                          const t = (s.type || '').toLowerCase();
                          const cls = t === 'twitter' || t === 'x' || t === 'x-twitter' ? 'fa-brands fa-x-twitter'
                            : t === 'youtube' ? 'fa-brands fa-youtube'
                            : t === 'instagram' ? 'fa-brands fa-instagram'
                            : t === 'github' ? 'fa-brands fa-github'
                            : t === 'facebook' ? 'fa-brands fa-facebook'
                            : t === 'tiktok' ? 'fa-brands fa-tiktok'
                            : t === 'discord' ? 'fa-brands fa-discord'
                            : 'fa-solid fa-link';
                          return (
                            <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="social-icon" aria-label={s.type || 'Link'}>
                              <i className={cls} aria-hidden="true"></i>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                    </div>
                  )}
                </div>

                {/* Comments: placed under credits (not in the aside) */}
                <div className="comments" style={{ marginTop: 14 }}>
                  <h3>Comments</h3>

                  {/* Comment composer (shows avatar + placeholder) */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                    {user ? (
                      <>
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Your avatar" width={40} height={40} style={{ borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--border)' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <textarea
                            ref={composerRef}
                            className="comment-input"
                            value={commentText}
                            onChange={(e) => { setCommentText(e.target.value); autoResizeTextarea(e.target); }}
                            rows={1}
                            placeholder={`Comment as ${user.username}...`}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn primary" onClick={async () => {
                              const text = commentText && commentText.trim();
                              if (!text) return;
                              // If hCaptcha sitekey is configured, open a modal with the visible captcha box
                              if (HCAPTCHA_SITEKEY && typeof window !== 'undefined' && window.hcaptcha) {
                                pendingCommentRef.current = text;
                                setShowCaptchaDialog(true);
                                return;
                              }

                              // fallback: no hCaptcha configured or failed to load
                              setPosting(true);
                              try {
                                const r = await apiPostComment(model.id, text);
                                if (r?.comment) {
                                  setComments(prev => [r.comment, ...prev]);
                                  setCommentText('');
                                  if (composerRef.current) composerRef.current.style.height = 'auto';
                                  try { showToast('Comment posted'); } catch {}
                                }
                              } catch (e) {
                                console.error('post comment failed', e);
                              }
                              setPosting(false);
                            }} disabled={posting}>{posting ? 'Posting…' : 'Post comment'}</button>
                          </div>

                          {/* Captcha modal dialog */}
                          {showCaptchaDialog && (
                            <div
                              role="dialog"
                              aria-modal="true"
                              className="modal-backdrop"
                              style={{ zIndex: 2200 }}
                              onClick={() => {
                                /* click outside cancels */
                                setShowCaptchaDialog(false);
                                try {
                                  if (hcaptchaWidgetIdRef.current != null) {
                                    window.hcaptcha.reset(hcaptchaWidgetIdRef.current);
                                    hcaptchaWidgetIdRef.current = null;
                                  }
                                } catch (e) {}
                              }}
                            >
                              <div className="modal confirm-pop captcha-modal" style={{ maxWidth: 540, width: '92%' }} onClick={(e) => e.stopPropagation()}>
                                <div className="modal-head">Please verify you are human</div>
                                <div className="muted" style={{ marginBottom: 12 }}>Complete the captcha below to confirm you're not a bot. This helps keep our community clean.</div>

                                <div ref={modalHcaptchaContainerRef} className="hcaptcha-widget" style={{ marginBottom: 12 }} />

                                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                                  <button className="btn" onClick={() => {
                                    setShowCaptchaDialog(false);
                                    try {
                                      if (hcaptchaWidgetIdRef.current != null) {
                                        window.hcaptcha.reset(hcaptchaWidgetIdRef.current);
                                        hcaptchaWidgetIdRef.current = null;
                                      }
                                    } catch (e) {}
                                  }}>Cancel</button>
                                  <button className="btn primary" onClick={async () => {
                                    // ensure widget rendered
                                    if (!window || !window.hcaptcha || hcaptchaWidgetIdRef.current == null) { showToast('Captcha not ready'); return; }
                                    const token = window.hcaptcha.getResponse(hcaptchaWidgetIdRef.current);
                                    if (!token) { showToast('Please complete the captcha'); return; }
                                    setPosting(true);
                                    try {
                                      const txt = pendingCommentRef.current;
                                      pendingCommentRef.current = null;
                                      const r = await apiPostComment(model.id, txt, token);
                                      if (r?.comment) {
                                        setComments(prev => [r.comment, ...prev]);
                                        setCommentText('');
                                        if (composerRef.current) composerRef.current.style.height = 'auto';
                                        try { showToast('Comment posted'); } catch {}
                                      }
                                    } catch (e) {
                                      console.error('post comment via captcha failed', e);
                                    } finally {
                                      setPosting(false);
                                      setShowCaptchaDialog(false);
                                      try { window.hcaptcha.reset(hcaptchaWidgetIdRef.current); } catch (e) {}
                                      hcaptchaWidgetIdRef.current = null;
                                    }
                                  }}>Post</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="muted">Please log in to post comments.</p>
                    )}
                  </div>

                  <div className="comments-divider" />
                  <div style={{ marginTop: 12 }}>
                    {comments.length === 0 && <p className="muted">No comments yet.</p>}
                    {comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                        {/* clickable avatar -> author page */}
                        <a
                          href={`/user/${encodeURIComponent(String(c.username || ''))}`}
                          onClick={(e) => { e.preventDefault(); try { navigate(`/user/${encodeURIComponent(String(c.username || ''))}`); } catch (_) {} }}
                          style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                          title={c.username}
                        >
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={`${c.username} avatar`} width={36} height={36} style={{ borderRadius: '50%', display: 'block' }} />
                          ) : (
                            <span className="avatar-initial-primary" aria-hidden="true" style={{ width: 36, height: 36, fontSize: 14 }}>{(c.username || '?').charAt(0).toUpperCase()}</span>
                          )}
                        </a>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a
                              className="comment-author"
                              href={`/user/${encodeURIComponent(String(c.username || ''))}`}
                              onClick={(e) => { e.preventDefault(); try { navigate(`/user/${encodeURIComponent(String(c.username || ''))}`); } catch (_) {} }}
                              style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}
                            >
                              {c.username}
                            </a>
                            <div className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</div>
                            {user && c.userId && (
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                {/* Edit only for the comment owner */}
                                {String(c.userId) === String(user.userId) && (
                                  <button
                                    className="comment-action-icon"
                                    title="Edit comment"
                                    aria-label="Edit comment"
                                    onClick={() => { setEditingId(c.id); setEditingText(c.text); }}
                                  >
                                    <i className="fa-solid fa-pen" aria-hidden="true"></i>
                                  </button>
                                )}

                                {/* Delete allowed for owner or admins */}
                                {(String(c.userId) === String(user.userId) || !!user.isAdmin) && (
                                  <button
                                    className="comment-action-icon"
                                    title="Delete comment"
                                    aria-label="Delete comment"
                                    onClick={async () => {
                                      try {
                                        const ok = await confirm('Delete this comment?');
                                        if (!ok) return;
                                        const r = await apiDeleteComment(model.id, c.id);
                                        if (r?.ok) {
                                          setComments(prev => prev.filter(x => x.id !== c.id));
                                          try { showToast('Comment deleted'); } catch {}
                                        }
                                      } catch (_) {}
                                    }}
                                  >
                                    <i className="fa-solid fa-trash" aria-hidden="true"></i>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {editingId === c.id ? (
                            <div style={{ marginTop: 8 }}>
                              <textarea
                                ref={editRef}
                                value={editingText}
                                onChange={(e) => { setEditingText(e.target.value); autoResizeTextarea(e.target); }}
                                rows={1}
                                className="comment-input"
                                style={{ borderBottom: '1px solid var(--border)' }}
                              />
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button className="btn primary" onClick={async () => {
                                  if (!editingText || !editingText.trim()) return;
                                  try {
                                    const r = await apiEditComment(model.id, c.id, editingText.trim());
                                    if (r?.comment) {
                                      setComments(prev => prev.map(p => p.id === c.id ? r.comment : p));
                                      setEditingId(null);
                                      setEditingText('');
                                      try { showToast('Comment updated'); } catch {}
                                    }
                                  } catch (_) {}
                                }}>Save</button>
                                <button className="btn" onClick={() => { setEditingId(null); setEditingText(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="muted" style={{ marginTop: 6 }}>{c.text}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

        <aside className="detail-side">
          {model.publishedAt && (
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              Published {new Date(model.publishedAt).toLocaleDateString()}
            </div>
          )}

          {/* Dimensions (computed from .mcstructure when available) */}
          {dimsLoading && (
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Detecting dimensions…</div>
          )}
          {dimensions && (typeof dimensions.length === 'number') && (
            <div style={{ marginTop: 8 }}>
              <h3 style={{ margin: '0 0 6px' }}>Dimensions</h3>
              <div className="muted">{dimensions.length} × {dimensions.width} × {dimensions.height} blocks</div>
            </div>
          )}

          {/* like/favorite controls now live inside the viewer overlay */}

          <div className="description" style={{ marginBottom: 4 }}>
            <p className="detail-desc">{model.description || 'No description provided.'}</p>
          </div>

          {Array.isArray(model.categories) && model.categories.length > 0 && (
            <div className="categories" style={{ marginTop: 12 }}>
              <h3 style={{ margin: '0 0 6px' }}>Tags</h3>
              <div className="tags">
                {model.categories.map((c, idx) => (
                  <span className="tag" key={idx}>{c}</span>
                ))}
              </div>
            </div>
          )}

          <div className="materials">
            <h3>Materials needed</h3>
            {materials.length > 0 ? (
              <>
                <ul>
                  {visibleMaterials.map((mat, i) => (
                    <MaterialRow key={i} mat={mat} />
                  ))}
                </ul>
                {showCollapse && !materialsExpanded && (
                  <button className="btn" style={{ marginTop: 8 }} onClick={() => setMaterialsExpanded(true)}>
                    ...{hiddenCount} more items, view more
                  </button>
                )}
                {showCollapse && materialsExpanded && (
                  <button className="btn" style={{ marginTop: 8 }} onClick={() => setMaterialsExpanded(false)}>
                    Show less
                  </button>
                )}
              </>
            ) : (
              <p className="muted">No materials list provided.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
