import { useNavigate } from 'react-router-dom';

// Returns a navigate-like function that forces a full page reload
// for most routes, except when navigating to admin tab URLs ("/admin?tab=...").
export default function useReloadableNavigate() {
  const navigate = useNavigate();
  return (to, options) => {
    const toStr = String(to || '');
    const isAdminTab = toStr.startsWith('/admin') && toStr.includes('tab=');
    if (isAdminTab) {
      // use SPA navigation for admin tab switches
      navigate(to, options);
      return;
    }
    // otherwise perform a full reload to the target path
    if (/^https?:\/\//.test(toStr)) {
      window.location.href = toStr;
      return;
    }
    // ensure leading slash
    const path = toStr.startsWith('/') ? toStr : `/${toStr}`;
    window.location.href = window.location.origin + path;
  };
}
