import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from './ModelViewer';

export default function ModelCard({ model, actionLabel, onAction }) {
  const { id, name, description, url, categories } = model;
  // derive author from model.credits which may be a string or an object
  const author = typeof model.credits === 'string' ? model.credits : model.credits?.author;
  const navigate = useNavigate();

  return (
    <div className="model-card" draggable={false} onDragStart={(e) => e.preventDefault()}>
      <div className="model-card-viewer" draggable={false} onDragStart={(e) => e.preventDefault()}>
        <ModelViewer url={url} modelId={id} />
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
          <button className="btn" onClick={() => onAction(model)}>{actionLabel || 'Action'}</button>
        ) : (
          <button className="btn" onClick={() => navigate(`/model/${encodeURIComponent(String(id))}`)}>View details</button>
        )}
      </div>
    </div>
  );
}
