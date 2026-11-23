import Logo from './Logo.jsx';

// Shared shell for Login and Register
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-ink-600 bg-ink-800 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-400">{footer}</p>
      </div>
    </main>
  );
}
