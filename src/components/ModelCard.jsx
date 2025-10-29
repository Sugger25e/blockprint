import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ModelCard({ model, actionLabel, onAction }) {
  const { id, name, description, url, categories, previewImage, previewImageUrl } = model;
  const author = typeof model.credits === 'string' ? model.credits : model.credits?.author;
  const navigate = useNavigate();

  const imgSrc = previewImage || previewImageUrl || null;

  const openDetails = () => navigate(`/model/${encodeURIComponent(String(id))}`);

  return (
    <div className="model-card" draggable={false} onDragStart={(e) => e.preventDefault()}>
      <div className="model-card-viewer" draggable={false}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${name} preview`}
            loading="lazy"
            className="model-card-screenshot"
            onClick={openDetails}
            style={{ width: '100%', height: '200px', objectFit: 'cover', cursor: 'pointer', background: 'transparent' }}
          />
        ) : (
          <div className="viewer-spinner" aria-hidden="true" style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner-ring" aria-hidden="true"></div>
            <span className="sr-only">Loading preview</span>
          </div>
        )}
      </div>

      <div className="model-card-info">
        <div>
          <div className="model-card-title" title={name}>{name}</div>
          {author && <div className="model-card-author muted">by {author}</div>}
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
          <button className="btn" onClick={openDetails}>
            View details
          </button>
        )}
      </div>
    </div>
  );
}
