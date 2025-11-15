import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useReloadableNavigate from '../utils/useReloadableNavigate';
import { getMyFavorites, getMyLikes, getBuildStats } from '../utils/modelActions';
import { useConfirm, useToast } from '../context/UiContext';
import ModelCard from '../components/ModelCard';
import Tooltip from '../components/Tooltip';

export default function Profile() {
  const { user, loading, login, logout } = useAuth();
  const [subs, setSubs] = useState([]);
  const [myBuilds, setMyBuilds] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [likesLoading, setLikesLoading] = useState(true);
  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [downloadsLoading, setDownloadsLoading] = useState(true);
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const navigate = useReloadableNavigate();
  const location = useLocation();
  const routerNavigate = useNavigate();

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

  // If redirected here with a toast in location.state, show it and clear the state
  useEffect(() => {
    try {
      const t = location?.state?.toast;
      if (t && t.message) {
        try { showToast(t.message, t.type); } catch {}
        // clear state so the toast doesn't repeat on refresh/back
        routerNavigate(location.pathname, { replace: true, state: null });
      }
    } catch (_) {}
  }, [location, routerNavigate, showToast]);

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

  // Aggregate downloads across the user's published builds
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        setDownloadsLoading(true);
        if (!myBuilds || myBuilds.length === 0) {
          if (!cancelled) setDownloadsTotal(0);
          return;
        }
        let total = 0;
        for (const b of myBuilds) {
          try {
            const s = await getBuildStats(b.id || b.numericId || b.buildId);
            if (!s) continue;
            const d = Number(s.downloadCount) || Number(s.downloads) || Number(s.download) || 0;
            total += d;
          } catch (_) {}
          if (cancelled) return;
        }
        if (!cancelled) setDownloadsTotal(total);
      } catch (_) {
        if (!cancelled) setDownloadsTotal(0);
      } finally {
        if (!cancelled) setDownloadsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [myBuilds, user]);

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
      <div className="profile-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" width={40} height={40} style={{ borderRadius: '50%' }} />
          ) : (
            <span className="avatar-initial-primary" style={{ width: 40, height: 40, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">{(user.username || '?').charAt(0).toUpperCase()}</span>
          )}
          <div>
            <h2 style={{ margin: 0 }}>{user.username}</h2>
            {/* Counters row (builds, likes, favorites, downloads) */}
            {(() => {
              const statsLoading = dataLoading || likesLoading || downloadsLoading;
              const buildsCount = myBuilds ? myBuilds.length : 0;
              const likes = likesCount != null ? likesCount : 0;
              const favs = favorites ? favorites.length : 0;
              const downloads = downloadsTotal != null ? downloadsTotal : 0;
              return (
                <div className="muted" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center', fontSize: 14 }}>
                  <Tooltip content={statsLoading ? '…' : `${buildsCount} ${buildsCount === 1 ? 'build' : 'builds'}`} delay={80} followCursor={false}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-cubes" aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 14 }}></i>
                      <span>{statsLoading ? '…' : buildsCount}</span>
                    </span>
                  </Tooltip>

                  <Tooltip content={statsLoading ? '… likes' : `${likes} likes`} delay={80} followCursor={false}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-heart" aria-hidden="true" style={{ color: '#ef4444', fontSize: 14 }}></i>
                      <span>{statsLoading ? '…' : likes}</span>
                    </span>
                  </Tooltip>

                  <Tooltip content={statsLoading ? '… favorites' : `${favs} favorites`} delay={80} followCursor={false}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-star" aria-hidden="true" style={{ color: '#fbbf24', fontSize: 14 }}></i>
                      <span>{statsLoading ? '…' : favs}</span>
                    </span>
                  </Tooltip>

                  <Tooltip content={statsLoading ? '… downloads' : `${downloads} downloads`} delay={80} followCursor={false}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-download" aria-hidden="true" style={{ color: 'var(--success)', fontSize: 14 }}></i>
                      <span>{statsLoading ? '…' : downloads}</span>
                    </span>
                  </Tooltip>
                </div>
              );
            })()}
          </div>
        </div>
  <div className="profile-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={() => {
            const handle = encodeURIComponent(user?.username || user?.discordId || user?.userId || user?.id || '');
            if (handle) navigate(`/user/${handle}`);
          }}>View public profile</button>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>

          {/* Combined published builds and pending submissions */}
          {dataLoading ? (
            <div className="grid fade-in" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="model-card">
                  <div className="model-card-viewer"><div className="skeleton skeleton-viewer" aria-hidden="true"></div></div>
                  <div className="model-card-info"><div className="skeleton skeleton-line" style={{ width: '70%' }} aria-hidden="true"></div></div>
                </div>
              ))}
            </div>
          ) : (
            (() => {
              // Normalize and combine both lists so pending items show alongside published builds
              const resolveUrl = (ref) => (ref ? (ref.startsWith('http') ? ref : `${API_BASE}${ref}`) : null);

              const mappedSubs = (subs || []).map(s => {
                // Prefer numericId for public/manage URLs when available
                const numeric = s.numericId || (s.submission && s.submission.numericId) || null;
                const idVal = numeric || s.id || s._id || null;
                return {
                  id: idVal,
                  rawId: s.id || s._id,
                  numericId: numeric,
                  type: s.type || (s.numericId || numeric ? 'build' : 'submission'),
                  name: s.name,
                  description: s.description,
                  categories: s.categories || [],
                  createdAt: s.createdAt,
                  status: s.status || (s.type === 'submission' ? 'pending' : 'pending'),
                  previewImage: resolveUrl(s.previewImage || s.previewImageUrl || s.previewImagePath || null),
                  glbUrl: resolveUrl(s.glbUrl || s.glbPath || null)
                };
              });

              const mappedBuilds = (myBuilds || []).map(b => ({
                id: b.numericId || b.id || b.buildId || b._id,
                rawId: b.buildId || b._id,
                numericId: b.numericId || null,
                type: 'build',
                name: b.name,
                description: b.description,
                categories: b.categories || [],
                createdAt: b.publishedAt || b.createdAt,
                status: b.ready ? 'published' : 'pending',
                previewImage: resolveUrl(b.previewImage || b.previewImageUrl || null),
                glbUrl: resolveUrl(b.url || b.glbUrl || null),
                buildId: b.buildId || b._id
              }));

              const combined = [...mappedSubs, ...mappedBuilds].filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

              if (combined.length === 0) return null;

              return (
                <div className="grid" style={{ gap: 12 }}>
                  {combined.map(item => (
                    <div key={item.rawId || item.id} className="card" style={{ padding: 12 }}>
                      {item.type === 'submission' ? (
                        <ModelCard
                          model={{
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            previewImage: item.previewImage,
                            categories: item.categories,
                            ready: false,
                            status: 'pending'
                          }}
                          actionLabel="Cancel"
                          onAction={() => onDelete(item.rawId || item.rawId || item.id)}
                          showStatus={true}
                          createdAt={item.createdAt}
                          viewFromProfile={true}
                        />
                      ) : (
                        <ModelCard
                          model={{
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            previewImage: item.previewImage,
                            categories: item.categories,
                            ready: item.status === 'published',
                            status: item.status
                          }}
                          managePath={`/profile/${encodeURIComponent(user?.discordId || user?.userId || user?.id)}/manage/${encodeURIComponent(item.numericId || item.id || item.buildId || item.rawId)}`}
                          showStatus={true}
                          viewFromProfile={true}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}

      {/* Show empty state only when both lists are empty and loading finished */}
      {!dataLoading && myBuilds.length === 0 && subs.length === 0 && (
        <div className="panel">
          <p className="muted">You haven’t submitted any builds yet.</p>
        </div>
      )}

      {/* Removed the previous "Your profile" section; favorites and personal stats are shown above */}
    </div>
  );
}
