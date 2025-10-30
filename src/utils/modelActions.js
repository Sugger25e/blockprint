const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export async function getBuildStats(id) {
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/stats`, { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}

export async function toggleLike(id) {
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/like`, { method: 'POST', credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}

export async function toggleFavorite(id) {
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/favorite`, { method: 'POST', credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}

export async function getComments(id) {
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/comments`, { credentials: 'include' });
  if (!res.ok) return { comments: [] };
  return res.json();
}

export async function postComment(id, text, hcaptchaToken) {
  const body = { text };
  if (hcaptchaToken) body.hcaptchaToken = hcaptchaToken;
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) return null;
  return res.json();
}

export async function editComment(id, commentId, text) {
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/comments/${encodeURIComponent(String(commentId))}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteComment(id, commentId) {
  const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(String(id))}/comments/${encodeURIComponent(String(commentId))}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getMyFavorites() {
  const res = await fetch(`${API_BASE}/api/my/favorites`, { credentials: 'include' });
  if (!res.ok) return { favorites: [] };
  return res.json();
}

export async function getMyLikes() {
  const res = await fetch(`${API_BASE}/api/my/likes`, { credentials: 'include' });
  if (!res.ok) return { count: 0, ids: [] };
  return res.json();
}
