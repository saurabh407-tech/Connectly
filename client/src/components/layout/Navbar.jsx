import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../common/Logo.jsx';
import { buttonClasses } from '../common/Button.jsx';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#security', label: 'Security' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="homepage-navbar sticky top-0 z-30 border-b backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo className="homepage-navbar__logo" />

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="homepage-navbar__link text-sm font-medium">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className={buttonClasses({ variant: 'ghost', className: 'homepage-navbar__login' })}>
            Log in
          </Link>
          <Link to="/register" className={buttonClasses({ className: 'homepage-navbar__cta' })}>
            Get started
          </Link>
        </div>

        <button
          className="homepage-navbar__menu rounded-lg p-2 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="homepage-navbar__mobile space-y-1 border-t px-4 pb-4 pt-3 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="homepage-navbar__link block rounded-lg px-3 py-2 text-sm font-medium"
            >
              {l.label}
            </a>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link to="/login" className={buttonClasses({ variant: 'secondary', className: 'homepage-navbar__mobile-login' })}>
              Log in
            </Link>
            <Link to="/register" className={buttonClasses({ className: 'homepage-navbar__cta' })}>
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
