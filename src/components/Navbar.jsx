import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { theme, toggle } = useTheme();
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
      </div>
    </header>
  );
}
