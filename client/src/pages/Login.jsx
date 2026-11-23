
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import AuthCard from '../components/common/AuthCard.jsx';
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
    <div className="flex h-dvh items-center justify-center overflow-hidden bg-[#F4F1EA] px-4 py-4 font-sans text-[#292A27]">

      {/* Main Container */}
      <div className="mx-auto flex h-full max-h-[760px] w-full max-w-5xl items-stretch gap-3 overflow-hidden rounded-[28px] border border-[#DED8CE] bg-[#FBF9F5] p-3 shadow-[0_25px_80px_rgba(41,42,39,0.10)]">

        {/* Left Panel */}
        <aside className="relative hidden min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-[28px] bg-[#53665A] p-8 text-[#F4F1EA] sm:p-10 lg:p-12 md:flex">

          <div className="relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-3 font-heading text-xl font-bold"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F1EA] text-[#53665A]">
                C
              </span>
              Connectly
            </Link>

            <div className="mt-20">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D8DFD5]">
                Connectly / Personal
              </p>

              <h1 className="mt-5 max-w-sm font-heading text-4xl font-semibold leading-tight">
                Make room for the conversations that matter.
              </h1>

              <p className="mt-5 max-w-sm text-sm leading-7 text-[#E0E5DD]">
                Messages, calls and shared moments, gathered in one thoughtfully
                designed space.
              </p>
            </div>
          </div>

          {/* Quote */}
          <div className="relative z-10 max-w-sm rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D6C2A8]" />
              <p className="text-xs font-medium tracking-wide text-[#D8DFD5]">
                A little reminder
              </p>
            </div>

            <p className="text-sm leading-6">
              "Good conversations make distance feel smaller."
            </p>

            <p className="mt-3 text-xs text-[#D8DFD5]">
              — Connectly
            </p>
          </div>

          {/* Decorations */}
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-60 w-60 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute right-12 top-28 h-24 w-24 rounded-full bg-white/5 blur-2xl" />

        </aside>

        {/* Right Login Panel */}
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[28px] bg-[#0B1015] p-5 sm:p-8 lg:p-10">

          <div className="w-full max-w-md">

            {/* Mobile Logo */}
            <div className="mb-8 flex items-center justify-center gap-3 md:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#53665A] font-bold text-[#F4F1EA]">
                C
              </span>
              <span className="font-heading text-xl font-bold text-white">
                Connectly
              </span>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <div className="mb-3 inline-flex items-center rounded-full bg-[#E9E5DC] px-3 py-1 text-xs font-semibold tracking-wide text-[#53665A]">
                WELCOME BACK
              </div>

              <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#F4F1EA] sm:text-4xl">
                Log in
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#A5AAA8]">
                Pick up your conversations where you left off.
              </p>
            </div>

            {/* Login Card */}
            <AuthCard
              title=""
              subtitle=""
              footer={
                <span className="text-[#A5AAA8]">
                  New to Connectly?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-[#9C6B4E] transition hover:text-[#C28A68]"
                  >
                    Create an account
                  </Link>
                </span>
              }
            >
              <form onSubmit={handleSubmit} noValidate className="space-y-5">

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

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-[#B94F42]/20 bg-[#B94F42]/10 px-3 py-3 text-sm text-[#B94F42]"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Login Button */}
                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  <span className="inline-flex items-center gap-2">
                    Log in <ArrowRight size={16} />
                  </span>
                </Button>

              </form>
            </AuthCard>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-[#929188]">
              Private conversations. Simple connections.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
