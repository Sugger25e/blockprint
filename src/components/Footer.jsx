import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-left">© {year} KuSug. All rights reserved.</div>
        <nav className="footer-nav" aria-label="Footer">
          <a href="https://discord.gg/3q97qPZmAC" className='muted' target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="/terms" className="muted">Terms</a>
          <a href="/privacy" className="muted">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
