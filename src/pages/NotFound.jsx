import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found — Blockprint';
  }, []);
  return (
    <div className="detail" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
      <div className="detail-header">
        <Link className="back-btn" to="/"><i className="fa-solid fa-arrow-left"></i><span>Back</span></Link>
        <h2>404</h2>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
        <div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😵‍💫</div>
          <h3 style={{ margin: '0 0 8px' }}>Page not found</h3>
          <p className="muted" style={{ maxWidth: 560, margin: '0 auto' }}>
            The page you’re looking for doesn’t exist or may have been moved. Try going back or visiting the Discover page.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link className="btn" to="/">Back to Discover</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
