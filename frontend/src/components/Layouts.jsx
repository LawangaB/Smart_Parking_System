import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to main content
    </a>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>Smart Parking Management System. Reserve a bay before you arrive.</p>
      </div>
    </footer>
  );
}

/** Home, login and registration. */
export function PublicLayout() {
  return (
    <div className="shell">
      <SkipLink />
      <Navbar />
      <main id="main" className="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

