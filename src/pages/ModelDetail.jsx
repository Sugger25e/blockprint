import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useModels } from '../context/ModelsContext';
import ModelViewer from '../components/ModelViewer';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/UiContext';
import { getBuildStats, toggleLike as apiToggleLike, toggleFavorite as apiToggleFavorite, getComments as apiGetComments, postComment as apiPostComment, editComment as apiEditComment, deleteComment as apiDeleteComment } from '../utils/modelActions';

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
  const [likeCount, setLikeCount] = useState(null);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
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
  const hcaptchaContainerRef = useRef(null);
  const pendingCommentRef = useRef(null);
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
    const title = `${model.name} — Blockprint`;
    const desc = model.description || 'Minecraft build on Blockprint';
    const author = model.credits?.author || undefined;
    const url = typeof window !== 'undefined' ? window.location.href : undefined;
    const image = ogImage || undefined;

    document.title = title;
    setNamedMeta('description', desc);
    if (author) setNamedMeta('author', author);
    setNamedMeta('theme-color', '#3b82f6');
    setOG('og:title', title);
    setOG('og:description', desc);
    setOG('og:site_name', 'Blockprint');
    setOG('og:type', 'website');
    if (url) setOG('og:url', url);
    if (image) setOG('og:image', image);
    setTwitter('twitter:card', 'summary_large_image');
    setTwitter('twitter:title', title);
    setTwitter('twitter:description', desc);
    if (image) setTwitter('twitter:image', image);
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
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (_e) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) {}
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
            <Link className="back-btn" to="/"><i className="fa-solid fa-arrow-left"></i><span>Back</span></Link>
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
          <Link className="back-btn" to="/"><i className="fa-solid fa-arrow-left"></i><span>Back</span></Link>
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
              <Link className="btn" to="/">Back to Discover</Link>
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
        <Link className="back-btn" to="/"><i className="fa-solid fa-arrow-left"></i><span>Back</span></Link>
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

      {typeof likeCount === 'number' && (
        <div className="viewer-like-badge" aria-hidden="true">{likeCount} likes</div>
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
                        {model.credits.avatarUrl && (
                          <img src={model.credits.avatarUrl} alt="Author avatar" width={28} height={28} style={{ borderRadius: '50%' }} />
                        )}
                        <span className="author-label">Author:</span>
                        <span className="author-name">{model.credits.author}</span>
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
                            <div ref={hcaptchaContainerRef} style={{ display: 'none' }} />
                            <button className="btn primary" onClick={async () => {
                              const text = commentText && commentText.trim();
                              if (!text) return;
                              // If hCaptcha sitekey is configured, use invisible widget flow
                              if (HCAPTCHA_SITEKEY && window && window.hcaptcha) {
                                // save pending comment and execute widget
                                pendingCommentRef.current = text;
                                setPosting(true);
                                try {
                                  if (hcaptchaWidgetIdRef.current == null) {
                                    // try to render on the fly (fallback)
                                    try {
                                      hcaptchaWidgetIdRef.current = window.hcaptcha.render(hcaptchaContainerRef.current, {
                                        sitekey: HCAPTCHA_SITEKEY,
                                        size: 'invisible',
                                        callback: async (token) => {
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
                                            console.error('post comment via hcaptcha failed', e);
                                          } finally {
                                            setPosting(false);
                                            try { window.hcaptcha.reset(hcaptchaWidgetIdRef.current); } catch {}
                                          }
                                        }
                                      });
                                    } catch (e) {
                                      console.error('hcaptcha render failed', e);
                                    }
                                  }
                                  // execute (this will call our callback)
                                  if (hcaptchaWidgetIdRef.current != null) {
                                    try { window.hcaptcha.execute(hcaptchaWidgetIdRef.current); } catch (e) { console.error(e); setPosting(false); }
                                    return;
                                  }
                                } catch (e) {
                                  console.error('hcaptcha flow error', e);
                                  setPosting(false);
                                }
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
                        {c.avatarUrl ? <img src={c.avatarUrl} alt="avatar" width={36} height={36} style={{ borderRadius: '50%' }} /> : <div style={{ width: 36 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontWeight: 600 }}>{c.username}</div>
                            <div className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</div>
                            {user && c.userId && String(c.userId) === String(user.userId) && (
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                <button
                                  className="comment-action-icon"
                                  title="Edit comment"
                                  aria-label="Edit comment"
                                  onClick={() => { setEditingId(c.id); setEditingText(c.text); }}
                                >
                                  <i className="fa-solid fa-pen" aria-hidden="true"></i>
                                </button>
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

          {/* like/favorite controls now live inside the viewer overlay */}

          <div className="description" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 6px' }}>Description</h3>
            <p className="detail-desc">{model.description || 'No description provided.'}</p>
          </div>

          {Array.isArray(model.categories) && model.categories.length > 0 && (
            <div className="categories" style={{ marginTop: 12 }}>
              <h3 style={{ margin: '0 0 6px' }}>Categories</h3>
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
