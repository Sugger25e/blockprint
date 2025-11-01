import React, { useMemo, useState, useEffect } from 'react';
import Tooltip from '../components/Tooltip';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useModels } from '../context/ModelsContext';
import ModelCard from '../components/ModelCard';
import NotFound from './NotFound';
import { getBuildStats } from '../utils/modelActions';

export default function User() {
  const { author } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { models, loading: modelsLoading } = useModels();
  const decoded = author ? decodeURIComponent(author) : '';

  const { user: me } = useAuth();

  // pick an avatar URL from the signed-in user (if viewing themselves) or one of the author's builds
  const authorAvatar = React.useMemo(() => {
    if (!decoded) return null;
    const want = String(decoded).trim().toLowerCase();
    // prefer the signed-in user's avatar when matching
    try {
      if (me && typeof me.username === 'string' && String(me.username).trim().toLowerCase() === want && me.avatarUrl) return me.avatarUrl;
    } catch (_) {}

    for (const m of models) {
      const c = m?.credits;
      if (!c) continue;
      // support different shapes: credits as object or string
      if (typeof c === 'string') continue;
      const a = String(c.author || '').trim().toLowerCase();
      if (!a || a !== want) continue;
      // check common avatar property names
      const candidate = c.avatarUrl || c.avatar || c.avatar_url || c.avatarUrlLarge || null;
      if (candidate) return candidate;
    }
    return null;
  }, [models, decoded, me]);

  const authorInitial = (decoded && decoded.length > 0) ? decoded.charAt(0).toUpperCase() : '?';

  // Pagination
  const PER_PAGE = 8;
  const paramPage = Number((new URLSearchParams(location.search)).get('page') || 1) || 1;
  const [page, setPage] = useState(paramPage);

  // Filter models by author (case-insensitive trim)
  const byAuthor = useMemo(() => {
    if (!decoded) return [];
    const want = String(decoded).trim().toLowerCase();
    return models.filter(m => {
      const c = m?.credits;
      if (!c) return false;
      if (typeof c === 'string') return String(c).toLowerCase().includes(want);
      const a = c.author || '';
      return String(a).trim().toLowerCase() === want;
    });
  }, [models, decoded]);

  // Aggregated stats
  const [likesTotal, setLikesTotal] = useState(null);
  const [favsTotal, setFavsTotal] = useState(null);
  const [downloadsTotal, setDownloadsTotal] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // If models are still loading, don't decide counts yet — keep showing loading state
    if (modelsLoading) {
      setStatsLoading(true);
      return () => { cancelled = true; };
    }
    setStatsLoading(true);
    (async () => {
      if (!byAuthor || byAuthor.length === 0) {
        // Models finished loading and author has no builds: show explicit zeros
        if (!cancelled) {
          setLikesTotal(0);
          setFavsTotal(0);
          setDownloadsTotal(0);
          setStatsLoading(false);
        }
        return;
      }
      try {
        let likes = 0;
        let favs = 0;
        let downloads = 0;
        // Fetch stats for each build sequentially to avoid too many parallel requests
        for (const m of byAuthor) {
          try {
            const s = await getBuildStats(m.id);
            if (!s) continue;
            likes += Number(s.likeCount) || 0;
            // backend returns favCount as "favCount"
            favs += Number(s.favCount || s.favcount || s.favoriteCount || 0) || 0;
            // support multiple possible download stat names
            downloads += Number(s.downloadCount) || Number(s.downloads) || Number(s.download) || 0;
          } catch (_) {}
          if (cancelled) return;
        }
        if (!cancelled) {
          setLikesTotal(likes);
          setFavsTotal(favs);
          setDownloadsTotal(downloads);
          setStatsLoading(false);
        }
      } catch (_) {
        if (!cancelled) {
          setLikesTotal(0);
          setFavsTotal(0);
          setDownloadsTotal(0);
          setStatsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [byAuthor]);

  useEffect(() => {
    setPage(paramPage);
  }, [paramPage]);

  const total = byAuthor.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(Math.max(1, page || 1), pages);
  const start = (current - 1) * PER_PAGE;
  const pageItems = byAuthor.slice(start, start + PER_PAGE);

  // If models finished loading and this author has no builds, treat as 404 and render full NotFound page
  if (!modelsLoading && decoded && byAuthor.length === 0) {
    return <NotFound />;
  }

  return (
    <div className="page user-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {authorAvatar ? (
            <img src={authorAvatar} alt={`${decoded} avatar`} width={48} height={48} style={{ borderRadius: '50%' }} />
          ) : (
            <span className="avatar-initial-primary" style={{ width: 48, height: 48, fontSize: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">{authorInitial}</span>
          )}
          <div>
            <h1 style={{ margin: 0 }}>{decoded || 'Unknown author'}</h1>
              <div className="muted" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center', fontSize: 14 }}>
                <Tooltip content={statsLoading ? '…' : `${total} ${total === 1 ? 'build' : 'builds'}`} delay={80} followCursor={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-cubes" aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 14 }}></i>
                    <span>{statsLoading ? '…' : total}</span>
                  </span>
                </Tooltip>

                <Tooltip content={statsLoading ? '… likes' : `${likesTotal} likes`} delay={80} followCursor={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-heart" aria-hidden="true" style={{ color: '#ef4444', fontSize: 14 }}></i>
                    <span>{statsLoading ? '…' : likesTotal}</span>
                  </span>
                </Tooltip>

                <Tooltip content={statsLoading ? '… favorites' : `${favsTotal} favorites`} delay={80} followCursor={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-star" aria-hidden="true" style={{ color: '#fbbf24', fontSize: 14 }}></i>
                    <span>{statsLoading ? '…' : favsTotal}</span>
                  </span>
                </Tooltip>

                <Tooltip content={statsLoading ? '… downloads' : `${downloadsTotal} downloads`} delay={80} followCursor={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-download" aria-hidden="true" style={{ color: 'var(--success)', fontSize: 14 }}></i>
                    <span>{statsLoading ? '…' : downloadsTotal}</span>
                  </span>
                </Tooltip>
              </div>
          </div>
        </div>
      </div>

      {modelsLoading ? (
        <div className="grid fade-in" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="model-card">
              <div className="model-card-viewer"><div className="skeleton skeleton-viewer" aria-hidden="true"></div></div>
              <div className="model-card-info"><div className="skeleton skeleton-line" style={{ width: '70%' }} aria-hidden="true"></div></div>
            </div>
          ))}
        </div>
      ) : byAuthor.length === 0 ? (
        // No builds for this author after models finished loading -> show 404
        <NotFound />
      ) : (
        <>
          <div className="grid fade-in">
            {pageItems.map(m => <ModelCard key={m.id} model={m} />)}
          </div>

          <div className="pager" style={{ justifyContent: 'center', marginTop: 18 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {current > 1 && <button className="btn" onClick={() => { const np = current - 1; setPage(np); navigate(`/user/${encodeURIComponent(decoded)}?page=${np}`); }}>Prev</button>}
              {Array.from({ length: pages }).map((_, i) => {
                const p = i + 1;
                const isActive = p === current;
                return (
                  <button key={p} className={`btn ${isActive ? 'pager-active' : ''}`} aria-current={isActive || undefined} onClick={() => { setPage(p); navigate(`/user/${encodeURIComponent(decoded)}?page=${p}`); }}>{p}</button>
                );
              })}
              {current < pages && <button className="btn" onClick={() => { const np = current + 1; setPage(np); navigate(`/user/${encodeURIComponent(decoded)}?page=${np}`); }}>Next</button>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="pager-summary" style={{ marginTop: 8 }}>{`Showing ${start + 1}–${Math.min(start + PER_PAGE, total)} of ${total} ${total === 1 ? 'build' : 'builds'}`}</div>
          </div>
        </>
      )}
    </div>
  );
}
