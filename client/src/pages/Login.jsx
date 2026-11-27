import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock, Mail, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import useAuthStore from '../store/authStore.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { validateLogin } from '../utils/validators.js';

export default function Login() {
  useDocumentTitle('Log in');

  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const found = validateLogin(form);
    setErrors(found);

    if (Object.keys(found).length) return;

    try {
      // Download the authenticated app while the sign-in request is in flight.
      void import('./Dashboard.jsx').catch(() => {});
      await login({
        email: form.email.trim(),
        password: form.password,
      });

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;

      if (status === 401)
        setError('Invalid email or password. Please try again.');
      else if (status === 400)
        setError('Please enter a valid email and password.');
      else if (!err.response)
        setError('Unable to connect to server. Please try again.');
      else
        setError('Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="relative isolate flex h-dvh items-center justify-center overflow-hidden bg-[#EAF0FC] px-3 py-2 font-sans text-[#253451] sm:px-4 sm:py-4">
      <div className="pointer-events-none absolute -left-40 -top-44 h-[30rem] w-[30rem] rounded-full border-[18px] border-white/45 bg-gradient-to-br from-white/80 to-[#D9E5FF]/70 shadow-[inset_-12px_-12px_32px_rgba(111,145,220,0.18),18px_18px_55px_rgba(91,123,191,0.16)] sm:-left-48 sm:-top-56" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[28rem] w-[28rem] rounded-full border-[14px] border-white/50 bg-gradient-to-br from-[#DDE8FF]/70 to-white/70 shadow-[inset_12px_12px_32px_rgba(111,145,220,0.13),-15px_-15px_50px_rgba(255,255,255,0.8)]" />
      <div className="pointer-events-none absolute right-[8%] top-[17%] h-28 w-28 rounded-full border border-white/80 bg-white/25 shadow-[inset_5px_5px_16px_rgba(126,151,201,0.15),8px_8px_25px_rgba(102,132,191,0.13)] blur-[1px]" />
      <div className="pointer-events-none absolute bottom-[16%] left-[9%] h-16 w-16 rounded-full bg-blue-300/25 blur-2xl" />

      <main className="relative z-10 flex h-full w-full max-w-md items-center">
        <section className="w-full rounded-[28px] border border-white/80 bg-white/40 p-4 shadow-[14px_18px_40px_rgba(91,117,171,0.16),-10px_-10px_32px_rgba(255,255,255,0.8)] backdrop-blur-xl sm:rounded-[32px] sm:p-6">
          <Link to="/" className="mx-auto mb-3 flex w-fit items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/90 bg-gradient-to-br from-white to-[#E3EBFB] text-blue-600 shadow-[8px_8px_20px_rgba(105,130,181,0.18),-7px_-7px_18px_rgba(255,255,255,0.9)]">
              <MessageCircle size={20} strokeWidth={2.4} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#243451]">Nexora</span>
          </Link>

        <div className="mb-3 text-center sm:mb-4">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl border border-white/85 bg-gradient-to-br from-white/95 to-[#DCE7FC] text-blue-600 shadow-[12px_12px_28px_rgba(103,130,187,0.2),-10px_-10px_26px_rgba(255,255,255,0.95)] sm:h-16 sm:w-16">
            <MessageCircle size={30} strokeWidth={1.8} />
          </div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-blue-600">Your conversations await</p>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#172747] sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-xs tracking-wide text-[#667796] sm:text-sm">Sign in to continue to Nexora</p>
        </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <Input
              label="Email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              icon={Lock}
              placeholder="Your password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
            />

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full rounded-2xl py-2.5 text-sm">
              <span className="inline-flex items-center gap-2">
                Sign in <ArrowRight size={18} />
              </span>
            </Button>
          </form>

          <div className="mt-3 border-t border-white/70 pt-3 text-center text-xs text-[#667796] sm:text-sm">
            New to Nexora?{' '}
            <Link to="/register" className="font-bold text-blue-700 transition hover:text-indigo-700">
              Create an account
            </Link>
          </div>
          <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7887A2]">
          Play · Compete · Grow together
          </p>
        </section>
      </main>
    </div>
  );
}
