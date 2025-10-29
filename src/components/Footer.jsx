import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-left">© {year} Sugger. All rights reserved.</div>
        <nav className="footer-nav" aria-label="Footer">
          <a href="/terms" className="muted">Terms</a>
          <a href="/privacy" className="muted">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
