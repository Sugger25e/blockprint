import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, loading, login, logout } = useAuth();
  const [subs, setSubs] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/my/submissions`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSubs(Array.isArray(data?.submissions) ? data.submissions : []);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user, API_BASE]);

  const onDelete = async (id) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/my/submissions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setSubs(prev => prev.filter(s => s.id !== id));
      }
    } catch (_) {}
    setBusyId(null);
  };

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>;
  if (!user) {
    return (
      <div className="page">
        <h2>My submissions</h2>
        <div className="panel">
          <p className="muted">Please log in with Discord to view and manage your submissions.</p>
          <button className="btn primary" onClick={login}><i className="fa-brands fa-discord" aria-hidden="true"></i> Login with Discord</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user.avatarUrl && <img src={user.avatarUrl} alt="Avatar" width={40} height={40} style={{ borderRadius: '50%' }} />}
          <div>
            <h2 style={{ margin: 0 }}>My submissions</h2>
            <div className="muted" style={{ fontSize: 14 }}>Signed in as {user.username}</div>
          </div>
        </div>
        <div>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="panel">
          <p className="muted">You haven’t submitted any builds yet.</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {subs.map(s => (
            <div key={s.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <button className="btn" onClick={() => onDelete(s.id)} disabled={busyId === s.id}>{busyId === s.id ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
              {s.description && <p className="muted" style={{ marginTop: 8 }}>{s.description}</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {(s.categories || []).map((c, idx) => <span key={idx} className="tag">{c}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
