import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import useReloadableNavigate from '../utils/useReloadableNavigate';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Tooltip from './Tooltip';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, login, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const toggleMenu = () => setOpen(o => !o);
  const location = useLocation();
  const onAdminLeaveNavigate = (cb) => {
    // Previously we forced a page reload when leaving /admin to refresh content.
    // That caused flashes and theme flicker. Instead just run the callback here
    // and let each page handle its own data refresh when mounted or navigated to.
    // If we are leaving /admin, emit a small event so pages can optionally refresh.
    try {
      if (location.pathname.startsWith('/admin')) {
        window.dispatchEvent(new CustomEvent('admin:navigate-away'));
      }
    } catch (_) {}
    cb && cb();
  };
  const isHome = location.pathname === '/';
  const isUpload = location.pathname === '/upload';
  const isAbout = location.pathname === '/about';
  const isFAQ = location.pathname === '/faq';
  const isAdminPath = location.pathname.startsWith('/admin');
  const isProfilePath = location.pathname.startsWith('/profile');

  const navigate = useReloadableNavigate();

  return (
    <header className="navbar">
      <div className="nav-inner">
        <a href="/" className="brand" onClick={() => onAdminLeaveNavigate()}>
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Blockprint" className="brand-logo" />
          <span className="brand-text">Blockprint</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="/" className={isHome ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>Home</a>
          <a href="/upload" className={isUpload ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>Upload</a>
          <a href="/faq" className={isFAQ ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>FAQ</a>
          <a href="/about" className={isAbout ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>About</a>
          {/* Admin tab only for whitelisted admins */}
          {/* Admin should navigate within SPA when switching tabs; use SPA navigate for admin tabs */}
          {!loading && user?.isAdmin && (
            <a href="/admin?tab=submissions" className={isAdminPath ? 'active' : undefined} onClick={(e) => { e.preventDefault(); onAdminLeaveNavigate(()=>navigate('/admin?tab=submissions')); }}>Admin</a>
          )}
        </nav>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Keep the theme switch visually stable by fixing its box size */}
          <div className="theme-switch-wrap" style={{ width: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className={`theme-switch ${theme === 'dark' ? 'is-dark' : ''}`}
              onClick={toggle}
              aria-label="Toggle theme"
              aria-pressed={theme === 'dark'}
            >
              <span className="switch-track">
                <span className="switch-thumb">
                  <i className="fa-solid fa-sun sun-icon" aria-hidden="true"></i>
                  <i className="fa-solid fa-moon moon-icon" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>

          {/* Reserve a box for avatar / login to avoid layout jumps on reload. Increased to fit a rectangular login button. */}
          <div className="nav-user" style={{ minWidth: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            ) : user ? (
              <div className="user-menu">
                <Tooltip content={user.username} delay={80} followCursor={false} position="bottom">
                  <a href="/profile" className="avatar-link" aria-label="Profile" onClick={() => onAdminLeaveNavigate()}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" width={32} height={32} style={{ borderRadius: 999 }} />
                    ) : (
                      <span className="avatar-initial-primary" aria-hidden="true" style={{ width: 32, height: 32, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{(user.username || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </a>
                </Tooltip>
              </div>
            ) : (
              /* show a rounded-rectangle login button with discord icon + text */
              <button
                className="btn"
                onClick={login}
                title="Login"
                style={{ minWidth: 84, height: 36, padding: '6px 10px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                <i className="fa-brands fa-discord" aria-hidden="true" />
                <span>Login</span>
              </button>
            )}
          </div>
          <button
            className={`hamburger`}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div id="mobile-menu" className={`mobile-menu ${open ? 'open' : ''}`}>
        {/* Mobile theme toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '8px 0' }}>
          <button
            className={`theme-switch ${theme === 'dark' ? 'is-dark' : ''}`}
            onClick={() => { toggle(); }}
            aria-label="Toggle theme"
            aria-pressed={theme === 'dark'}
          >
            <span className="switch-track">
              <span className="switch-thumb">
                <i className="fa-solid fa-sun sun-icon" aria-hidden="true"></i>
                <i className="fa-solid fa-moon moon-icon" aria-hidden="true"></i>
              </span>
            </span>
          </button>
        </div>
        <a href="/" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>Home</a>
  <a href="/upload" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>Upload</a>
        <a href="/faq" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>FAQ</a>
        <a href="/about" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>About</a>
          {!loading && (user ? (
          <>
            {/* 'My submissions' removed from mobile menu per user request */}
            {user.isAdmin && <a href="/admin?tab=submissions" onClick={(e)=>{ e.preventDefault(); setOpen(false); onAdminLeaveNavigate(()=>navigate('/admin?tab=submissions')); }}>Admin</a>}
          </>
        ) : (
          <button className="btn" onClick={()=>{ setOpen(false); login(); }} style={{ marginTop: 8 }}><i className="fa-brands fa-discord" aria-hidden="true"></i> Login</button>
        ))}
      </div>
    </header>
  );
}
