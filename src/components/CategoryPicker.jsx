import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function CategoryPicker({ categories = [], value = 'All', onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  const options = useMemo(() => {
    const base = ['All', ...categories];
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(c => c.toLowerCase().includes(q));
  }, [categories, query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const select = (val) => {
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div className="cat-picker" ref={wrapRef}>
      <button type="button" className={`cat-button ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="cat-current">{value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : value}</span>
        <span className="cat-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="cat-panel" role="listbox">
          <div className="cat-search-wrap">
            <input
              className="cat-search"
              type="text"
              placeholder="Search categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="cat-options">
            {options.length === 0 ? (
              <div className="cat-empty">No matches</div>
            ) : options.map((c) => (
              <button
                key={c}
                type="button"
                className={`cat-option ${String(c).toLowerCase() === String(value).toLowerCase() ? 'selected' : ''}`}
                onClick={() => select(c)}
                role="option"
                aria-selected={String(c).toLowerCase() === String(value).toLowerCase()}
              >
                <span className="cat-option-label">{c ? String(c).charAt(0).toUpperCase() + String(c).slice(1) : c}</span>
                {String(c).toLowerCase() === String(value).toLowerCase() && <i className="fa-solid fa-check cat-check" aria-hidden="true"></i>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
