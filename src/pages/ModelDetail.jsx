import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useModels } from '../context/ModelsContext';
import ModelViewer from '../components/ModelViewer';

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
      // If cached and already complete, finish immediately
      setImgDone(true);
    } else {
      // Safety timeout to avoid stuck skeletons
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
  const { models } = useModels();
  const idNum = Number(id);
  const model = models.find((m) => Number(m.id) === idNum);
  const [ogImage, setOgImage] = useState(null);

  // Try to capture a snapshot of the 3D canvas for social preview; fallback to a branded card
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
      // Fallback: generate a simple branded image
      try {
        const w = 1200, h = 630;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        // Background primary blue
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, w, h);
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Segoe UI, Roboto, Arial, sans-serif';
        const title = (model.name || 'Blockfolio Build').slice(0, 40);
        ctx.fillText(title, 60, 200);
        // Description
        ctx.font = '28px Segoe UI, Roboto, Arial, sans-serif';
        const desc = (model.description || '').slice(0, 140);
        wrapText(ctx, desc, 60, 260, w - 120, 36);
        // Author and site
        const author = model.credits?.author ? `by ${model.credits.author}` : '';
        ctx.font = 'bold 28px Segoe UI, Roboto, Arial, sans-serif';
        ctx.fillText(author, 60, h - 120);
        ctx.font = 'bold 32px Segoe UI, Roboto, Arial, sans-serif';
        ctx.fillText('Blockfolio', 60, h - 60);
        setOgImage(c.toDataURL('image/png'));
      } catch (_) {
        // ignore
      }
    }, 1400);
    return () => clearTimeout(timeout);
  }, [model]);

  // Utility: wrap text into multiple lines
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

  // Dynamic meta tags for this model
  useEffect(() => {
    if (!model) return;
    const title = `${model.name} — Blockfolio`;
    const desc = model.description || 'Minecraft build on Blockfolio';
    const author = model.credits?.author || undefined;
    const url = typeof window !== 'undefined' ? window.location.href : undefined;
    const image = ogImage || undefined;

    document.title = title;
    setNamedMeta('description', desc);
    if (author) setNamedMeta('author', author);
    setNamedMeta('theme-color', '#3b82f6');
    setOG('og:title', title);
    setOG('og:description', desc);
    setOG('og:site_name', 'Blockfolio');
    setOG('og:type', 'website');
    if (url) setOG('og:url', url);
    if (image) setOG('og:image', image);
    setTwitter('twitter:card', 'summary_large_image');
    setTwitter('twitter:title', title);
    setTwitter('twitter:description', desc);
    if (image) setTwitter('twitter:image', image);

    return () => {
      // Optionally clean up or leave tags in place
    };
  }, [model, ogImage]);

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

  // Prefer blob download to avoid blank-tab navigation and ensure .mcpack saves
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
      // Fallback: open the URL; the browser may still trigger a download
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) {}
    }
  }

  function suggestFileName(m) {
    const base = (m?.name || 'holoprint').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    return `${base}.holoprint.mcpack`;
  }

  if (!model) {
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

  return (
    <div className="detail">
      <div className="detail-header">
        <Link className="back-btn" to="/"><i className="fa-solid fa-arrow-left"></i><span>Back</span></Link>
        <h2 title={model.name}>{model.name}</h2>
      </div>
      <div className="detail-layout">
        <div className="detail-viewer">
          <ModelViewer url={model.url} allowZoom style={{ height: '70vh', borderRadius: 12 }} modelId={model.id} />
        </div>
        <aside className="detail-side">
          {model.description && (
            <p className="detail-desc">{model.description}</p>
          )}
          {/* Build Name on right removed per request */}

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
            {Array.isArray(model.materials) && model.materials.length > 0 ? (
              <ul>
                {model.materials.map((mat, i) => (
                  <MaterialRow key={i} mat={mat} />
                ))}
              </ul>
            ) : (
              <p className="muted">No materials list provided.</p>
            )}
          </div>

          <div className="holoprint">
            <h3 className="holoprint-title">Holoprint <span className="info" tabIndex={0}><i className="fa-solid fa-circle-info" aria-hidden="true"></i><span className="sr-only">Info</span></span><span className="info-bubble">A resource pack that displays a hologram of this build in your world to guide construction.</span></h3>
            <div className="actions">
              {model.holoprintUrl ? (
                <button className="btn primary" onClick={() => downloadHoloprint(model.holoprintUrl, suggestFileName(model))}>Download Holoprint</button>
              ) : (
                <button className="btn" disabled>Download Holoprint</button>
              )}
            </div>
          </div>

          {model.credits && (
            <div className="credits">
              <h3>Credits</h3>
              {typeof model.credits === 'string' ? (
                <p className="muted credits-row">{model.credits}</p>
              ) : (
                <div className="credits-row">
                  {model.credits.author && (
                    <div className="author">
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
        </aside>
      </div>
    </div>
  );
}
