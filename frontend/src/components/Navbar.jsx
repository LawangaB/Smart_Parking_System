import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BrandMark from './BrandMark';

export default function Navbar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem('smart-parking-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Close the mobile menu after every navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('smart-parking-theme', theme);
  }, [theme]);

  const links = [];
  const home = '/';

  function handleLogout() {
    logout();
    toast.success('You have been logged out.');
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <BrandMark to={home} />

        <button
          type="button"
          className="navbar-toggle"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>

        <div id="site-menu" className={`navbar-menu${open ? ' is-open' : ''}`}>
          {links.length > 0 && (
            <nav className="navbar-links" aria-label="Main">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="navbar-account">
            <button
              type="button"
              className="theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            {user ? (
              <>
                <span className="navbar-user">{user.fullName}</span>
                <button type="button" className="btn btn-on-blue" onClick={handleLogout}>
                  <LogOut size={16} aria-hidden="true" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="navbar-link">
                  Log in
                </NavLink>
                <NavLink to="/register" className="btn btn-on-blue">
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
