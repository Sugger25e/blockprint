import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

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
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Blockprint" className="brand-logo" />
          <span className="brand-text">Blockprint</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>Home</NavLink>
          <NavLink to="/upload" className={({isActive}) => isActive ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>Upload</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'active' : undefined} onClick={() => onAdminLeaveNavigate()}>About</NavLink>
          {/* Admin tab only for whitelisted admins */}
          {!loading && user?.isAdmin && (
            <NavLink to="/admin" className={({isActive}) => isActive ? 'active' : undefined}>Admin</NavLink>
          )}
        </nav>
        <div className="nav-right">
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
          {!loading && (
            user ? (
              <div className="user-menu">
                <NavLink to="/profile" className="avatar-link" title={user.username} aria-label="Profile">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" width={32} height={32} />
                  ) : (
                    <span className="avatar-fallback" aria-hidden="true">{(user.username || '?').charAt(0).toUpperCase()}</span>
                  )}
                </NavLink>
              </div>
            ) : (
              <button className="btn small" onClick={login}><i className="fa-brands fa-discord" aria-hidden="true"></i> Login</button>
            )
          )}
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
        <NavLink to="/" end onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>Home</NavLink>
  <NavLink to="/upload" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>Upload</NavLink>
        <NavLink to="/about" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>About</NavLink>
        {!loading && (user ? (
          <>
            <NavLink to="/profile" onClick={()=>onAdminLeaveNavigate(()=>setOpen(false))}>My submissions</NavLink>
            {user.isAdmin && <NavLink to="/admin" onClick={()=>{ setOpen(false); }}>Admin</NavLink>}
          </>
        ) : (
          <button className="btn" onClick={()=>{ setOpen(false); login(); }} style={{ marginTop: 8 }}><i className="fa-brands fa-discord" aria-hidden="true"></i> Login</button>
        ))}
      </div>
    </header>
  );
}
