import React, { useState, useRef, useEffect } from 'react';

// Lightweight tooltip component
// Props:
// - content: node/string to show inside the tooltip
// - children: target element (single React node)
// - delay: ms before showing tooltip (default 120)
// - followCursor: if true the tooltip will follow cursor horizontally (default true)
export default function Tooltip({ content, children, delay = 120, followCursor = true, className = '', position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: '50%' });
  const hoverRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => { clearTimeout(timeoutRef.current); };
  }, []);

  const handleEnter = (e) => {
    clearTimeout(timeoutRef.current);
    const rect = hoverRef.current?.getBoundingClientRect();
    if (followCursor && rect) {
      setPos({ x: `${Math.max(8, e.clientX - rect.left)}px` });
    }
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const handleMove = (e) => {
    if (!followCursor) return;
    const rect = hoverRef.current?.getBoundingClientRect();
    if (!rect) return;
    // keep tooltip inside the target bounds with some padding
    const x = Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left));
    setPos({ x: `${x}px` });
  };

  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    // small delay to allow quick hover flicker
    timeoutRef.current = setTimeout(() => setVisible(false), 80);
  };

  // Clone child to attach event handlers
  const child = React.Children.only(children);
  const cloned = React.cloneElement(child, {
    ref: hoverRef,
    onMouseEnter: (e) => { handleEnter(e); if (child.props.onMouseEnter) child.props.onMouseEnter(e); },
    onMouseMove: (e) => { handleMove(e); if (child.props.onMouseMove) child.props.onMouseMove(e); },
    onMouseLeave: (e) => { handleLeave(e); if (child.props.onMouseLeave) child.props.onMouseLeave(e); }
  });

  return (
    <span className={`tooltip-target ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      {cloned}
      <div
        className={`tooltip-box ${visible ? 'visible' : ''} ${position === 'bottom' ? 'position-bottom' : ''}`}
        role="tooltip"
        aria-hidden={!visible}
        style={{ left: pos.x }}
      >
        <div className="tooltip-content">{content}</div>
        <div className="tooltip-arrow" aria-hidden="true" />
      </div>
    </span>
  );
}
