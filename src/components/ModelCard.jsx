import React, { useEffect, useState } from 'react';
import useReloadableNavigate from '../utils/useReloadableNavigate';
import { getBuildStats } from '../utils/modelActions';

export default function ModelCard({ model, actionLabel, onAction, managePath, showStatus, createdAt, viewFromProfile, showAuthor }) {
  // model may include either `previewImage` or `previewImageUrl` depending on server response
  const { id, name, description, url, categories, previewImage, previewImageUrl, ready } = model;
  const navigate = useReloadableNavigate();

  const imgSrc = previewImage || previewImageUrl || null;
  const [likeCount, setLikeCount] = useState(null);
  const [downloadCount, setDownloadCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getBuildStats(id);
        if (!cancelled && s) {
          setLikeCount(typeof s.likeCount === 'number' ? s.likeCount : null);
          const d = typeof s.downloadCount === 'number' ? s.downloadCount : (typeof s.downloads === 'number' ? s.downloads : (typeof s.download === 'number' ? s.download : null));
          setDownloadCount(d != null ? d : null);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [id]);

  const openDetails = () => navigate(`/model/${encodeURIComponent(String(id))}${viewFromProfile ? '?from=profile' : ''}`);

  const statusLabel = (() => {
    if (!showStatus) return null;
    // Normalize possible server flags into Approved / Pending / Rejected
    // Supported shapes: model.ready (boolean), model.rejected (boolean), model.status ('approved'|'pending'|'rejected')
    if (model.rejected === true || String(model.status).toLowerCase() === 'rejected') return 'Rejected';
    if (model.ready === true || String(model.status).toLowerCase() === 'approved') return 'Approved';
    if (model.ready === false || String(model.status).toLowerCase() === 'pending') return 'Pending';
    return null;
  })();

  // Determine if image should act as a quick link. When showStatus is enabled and the
  // model is Approved we prefer explicit View/Manage buttons and avoid implicit image nav.
  const imageClickable = !(showStatus && statusLabel === 'Approved');

  return (
    <div className="model-card" draggable={false} onDragStart={(e) => e.preventDefault()}>
      <div className="model-card-viewer" draggable={false}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${name} preview`}
            loading="lazy"
            className="model-card-screenshot"
            onClick={imageClickable ? openDetails : undefined}
            style={{ width: '100%', height: '200px', objectFit: 'cover', cursor: imageClickable ? 'pointer' : 'default', background: 'transparent' }}
          />
        ) : (
          <div className="viewer-spinner" aria-hidden="true" style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner-ring" aria-hidden="true"></div>
            <span className="sr-only">Loading preview</span>
          </div>
        )}
        {(typeof likeCount === 'number' || typeof downloadCount === 'number') && (
          <div className="model-like-badge" title={`${likeCount || 0} likes · ${downloadCount || 0} downloads`}>
            {typeof likeCount === 'number' && (
              <>
                <i className="fa-solid fa-heart" style={{ color: '#ef4444', fontSize: 13 }} aria-hidden="true"></i>
                <span style={{ fontSize: 13 }}>{likeCount}</span>
              </>
            )}
            {typeof downloadCount === 'number' && (
              <>
                <i className="fa-solid fa-download" style={{ color: 'var(--muted)', fontSize: 13 }} aria-hidden="true"></i>
                <span style={{ fontSize: 13 }}>{downloadCount}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="model-card-info">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="model-card-title" title={name} style={{ flex: 1 }}>{name}</div>
            {statusLabel && <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{statusLabel}</div>}
          </div>
          {/* Show creation / publish date (muted) when provided */}
          {createdAt && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{new Date(createdAt).toLocaleString()}</div>
          )}
          {/* Optionally show author if requested (profile favorites) */}
          {showAuthor && (() => {
            // Determine author name from common shapes
            const credits = model?.credits;
            let authorName = null;
            if (typeof credits === 'string') authorName = credits;
            else if (credits && typeof credits === 'object') authorName = credits.author || null;
            else if (model?.author) authorName = model.author;
            if (!authorName) return null;
            return (
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                by <a href={`/user/${encodeURIComponent(authorName)}`} onClick={(e) => { e.preventDefault(); navigate(`/user/${encodeURIComponent(authorName)}`); }}>{authorName}</a>
              </div>
            );
          })()}
          {/* author removed per design: don't show author on cards */}
          {description && <div className="model-card-desc" title={description}>{description}</div>}
          {Array.isArray(categories) && categories.length > 0 && (
            <div className="tags">
              {categories.map((c, idx) => (
                <span className="tag" key={idx}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="model-card-actions">
        {typeof onAction === 'function' ? (
          <button className="btn" onClick={() => onAction(model)}>
            {actionLabel || 'Action'}
          </button>
        ) : (
          // When showStatus is enabled, follow explicit rules:
          // - Pending => only show Manage
          // - Approved => show View + Manage
          // - Rejected => show nothing
          showStatus ? (() => {
            if (!statusLabel) return null;
            if (statusLabel === 'Rejected') return null;
            if (statusLabel === 'Pending') {
              return managePath ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => navigate(managePath)}>Manage</button>
                </div>
              ) : null;
            }
            if (statusLabel === 'Approved') {
              return (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={openDetails}>View</button>
                  {managePath && <button className="btn" onClick={() => navigate(managePath)}>Manage</button>}
                </div>
              );
            }
            return null;
          })() : (
            // no showStatus: original fallback behaviour
            managePath ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={openDetails}>View</button>
                <button className="btn" onClick={() => navigate(managePath)}>Manage</button>
              </div>
            ) : (
              <button className="btn" onClick={openDetails}>View details</button>
            )
          )
        )}
      </div>
    </div>
  );
}
