import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, login, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const toggleMenu = () => setOpen(o => !o);
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand">Blockprint</Link>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : undefined}>Home</NavLink>
          <NavLink to="/upload" className={({isActive}) => isActive ? 'active' : undefined}>Upload</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'active' : undefined}>About</NavLink>
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
        <NavLink to="/" end onClick={()=>setOpen(false)}>Home</NavLink>
        <NavLink to="/upload" onClick={()=>setOpen(false)}>Upload</NavLink>
        <NavLink to="/about" onClick={()=>setOpen(false)}>About</NavLink>
        {!loading && (user ? (
          <>
            <NavLink to="/profile" onClick={()=>setOpen(false)}>My submissions</NavLink>
            {user.isAdmin && <NavLink to="/admin" onClick={()=>setOpen(false)}>Admin</NavLink>}
          </>
        ) : (
          <button className="btn" onClick={()=>{ setOpen(false); login(); }} style={{ marginTop: 8 }}><i className="fa-brands fa-discord" aria-hidden="true"></i> Login</button>
        ))}
      </div>
    </header>
  );
}
