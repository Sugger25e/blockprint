import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useReloadableNavigate from '../utils/useReloadableNavigate';
import { getMyFavorites, getMyLikes } from '../utils/modelActions';
import { useConfirm, useToast } from '../context/UiContext';
import ModelCard from '../components/ModelCard';

export default function Profile() {
  const { user, loading, login, logout } = useAuth();
  const [subs, setSubs] = useState([]);
  const [myBuilds, setMyBuilds] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [likesLoading, setLikesLoading] = useState(true);
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const navigate = useReloadableNavigate();

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setDataLoading(true);
    (async () => {
      try {
        const [subsRes, buildsRes] = await Promise.all([
          fetch(`${API_BASE}/api/my/submissions`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/my/builds`, { credentials: 'include' })
        ]);

        if (!cancelled) {
          try {
            if (subsRes && subsRes.ok) {
              const data = await subsRes.json();
              setSubs(Array.isArray(data?.submissions) ? data.submissions : []);
            } else {
              setSubs([]);
            }
          } catch (_) { setSubs([]); }

          try {
            if (buildsRes && buildsRes.ok) {
              const data = await buildsRes.json();
              setMyBuilds(Array.isArray(data?.builds) ? data.builds : []);
            } else {
              setMyBuilds([]);
            }
          } catch (_) { setMyBuilds([]); }
        }
      } catch (_) {
        if (!cancelled) { setSubs([]); setMyBuilds([]); }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, API_BASE]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const fav = await getMyFavorites();
        if (!cancelled && fav?.favorites) setFavorites(fav.favorites || []);
      } catch (_) {}
      try {
        setLikesLoading(true);
        const likes = await getMyLikes();
        if (!cancelled) setLikesCount(typeof likes.count === 'number' ? likes.count : 0);
      } catch (_) {
        if (!cancelled) setLikesCount(0);
      } finally {
        if (!cancelled) setLikesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const onDelete = async (id) => {
    try {
      const ok = await confirm('Delete this submission? This cannot be undone.');
      if (!ok) return;
    } catch (_) { return; }
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/my/submissions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setSubs(prev => prev.filter(s => s.id !== id));
        try { showToast('Submission deleted'); } catch {}
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

      {/* Submissions (pending) */}
      {dataLoading ? (
        <div className="panel"><p className="muted">Loading submissions…</p></div>
      ) : (
        subs.length > 0 && (
        <div className="grid" style={{ gap: 12 }}>
          {subs.map(s => (
            <div key={s.id} className="card" style={{ padding: 12 }}>
              {/* Render a compact ModelCard for visual consistency; expose Manage inside the card */}
              <ModelCard
                model={{
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  // Ensure preview image is absolute (prefix API_BASE when backend returns a relative path)
                  previewImage: s.previewImage ? (s.previewImage.startsWith('http') ? s.previewImage : `${API_BASE}${s.previewImage}`) : null,
                  categories: s.categories || [],
                  ready: false,
                  status: 'pending'
                }}
                managePath={`/profile/${encodeURIComponent(user?.discordId || user?.userId || user?.id)}/manage/${encodeURIComponent(s.numericId || s.id)}`}
                showStatus={true}
                createdAt={s.createdAt}
              />
            </div>
          ))}
          </div>
        )
      )}

      {/* Published builds */}
      {!dataLoading && myBuilds.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>My published builds</h3>
          <div className="grid" style={{ gap: 12 }}>
            {myBuilds.map(m => (
              <div key={m.buildId || m.id} className="card" style={{ padding: 12 }}>
                {/* Pass managePath so ModelCard can render the Manage button inside the card, and ask it to show status */}
                <ModelCard model={m} managePath={`/profile/${encodeURIComponent(user?.discordId || user?.userId || user?.id)}/manage/${encodeURIComponent(m.id || m.numericId || m.buildId || m._id)}`} showStatus={true} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show empty state only when both lists are empty and loading finished */}
      {!dataLoading && myBuilds.length === 0 && subs.length === 0 && (
        <div className="panel">
          <p className="muted">You haven’t submitted any builds yet.</p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h3>Your profile</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Liked models</div>
          <div className="muted">{likesLoading ? '-' : likesCount}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Your favorites</h4>
          {favorites.length === 0 ? (
            <p className="muted">You have no favorites yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {favorites.map(m => (
                <ModelCard key={m.id} model={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
