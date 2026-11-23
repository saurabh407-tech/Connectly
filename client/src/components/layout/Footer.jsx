import Logo from '../common/Logo.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-ink-600/60 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo />
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} Connectly. All rights reserved.</p>
      </div>
    </footer>
  );
}
