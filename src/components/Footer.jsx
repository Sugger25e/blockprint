import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <div>© {year} Sugger. All rights reserved.</div>
        <nav style={{ display: 'flex', gap: 12 }} aria-label="Footer">
          <a href="/terms" className="muted">Terms</a>
          <a href="/privacy" className="muted">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
