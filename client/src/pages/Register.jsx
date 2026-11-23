
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import AuthCard from '../components/common/AuthCard.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import useAuthStore from '../store/authStore.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { validateRegister } from '../utils/validators.js';

export default function Register() {
  useDocumentTitle('Create account');

  const navigate = useNavigate();
  const { register, loading } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));

    setErrors((er) => ({
      ...er,
      [e.target.name]: undefined,
    }));

    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const found = validateRegister(form);
    setErrors(found);

    if (Object.keys(found).length) return;

    const email = form.email.trim().toLowerCase();

    try {
      await register({
        name: form.name.trim(),
        email,
        password: form.password,
      });

      toast.success('Account created! Please verify your email.');

      navigate('/verify-email', {
        state: { email },
      });

    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || '';

      if (status === 409) {
        setError('This email is already registered. Please log in.');
      } else if (status === 400) {
        setError(message || 'Please check your information and try again.');
      } else if (!err.response) {
        setError('Unable to connect to server. Please try again.');
      } else {
        setError(message || 'Something went wrong. Please try again later.');
      }
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center overflow-hidden bg-[#F4F1EA] px-4 py-3 font-sans text-[#292A27]">

      {/* Main Container */}
      <div className="mx-auto flex h-full max-h-[680px] w-full max-w-5xl items-stretch gap-3 overflow-hidden rounded-[28px] border border-[#DED8CE] bg-[#FBF9F5] p-2.5 shadow-[0_25px_80px_rgba(41,42,39,0.10)]">

        {/* Left Register Panel */}
        <aside className="relative hidden min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-[28px] bg-[#53665A] p-8 text-[#F4F1EA] sm:p-9 lg:p-11 md:flex">

          {/* Logo */}
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

            {/* Register Content */}
            <div className="mt-14 lg:mt-16">

              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D6C2A8]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E0E5DD]">
                  Your journey starts here
                </span>
              </div>

              <h1 className="mt-5 max-w-sm font-heading text-4xl font-semibold leading-tight">
                Your next conversation starts here.
              </h1>

              <p className="mt-4 max-w-sm text-sm leading-7 text-[#E0E5DD]">
                Create your personal space to connect, share moments
                and stay close to the people who matter.
              </p>

              {/* Small Decorative Detail */}
              <div className="mt-7 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#53665A] bg-[#D6C2A8] text-xs font-bold text-[#53665A]">
                    C
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#53665A] bg-[#E9E5DC] text-xs font-bold text-[#53665A]">
                    +
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#53665A] bg-[#9C6B4E] text-xs font-bold text-white">
                    +
                  </span>
                </div>

                <p className="text-xs text-[#E0E5DD]">
                  Connect. Communicate. Belong.
                </p>
              </div>

            </div>
          </div>

          {/* Quote Card */}
          <div className="relative z-10 max-w-sm rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">

            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#D8DFD5]">
              A thought to begin with
            </p>

            <p className="text-sm leading-6">
              "Every meaningful connection starts with a hello."
            </p>

            <p className="mt-3 text-xs text-[#D8DFD5]">
              — Connectly
            </p>

          </div>

          {/* Background Decorations */}
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -bottom-16 -right-16 h-60 w-60 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute right-12 top-28 h-24 w-24 rounded-full bg-white/5 blur-2xl" />

        </aside>

        {/* Right Register Panel */}
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[28px] bg-[#0B1015] px-4 py-3 sm:px-5 lg:px-7">

          <div className="w-full max-w-sm">

            {/* Mobile Logo */}
            <div className="mb-3 flex items-center justify-center gap-3 md:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#53665A] font-bold text-[#F4F1EA]">
                C
              </span>

              <span className="font-heading text-xl font-bold text-white">
                Connectly
              </span>
            </div>

            {/* Register Heading */}
            <div className="mb-3 text-center">

              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#53665A]/40 bg-[#53665A]/15 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#49D9BD]" />
                <span className="text-[10px] font-semibold tracking-[0.16em] text-[#49D9BD]">
                  JOIN CONNECTLY
                </span>
              </div>

              <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#F4F1EA] sm:text-3xl">
                Create your account
              </h2>

              <p className="mt-1 text-xs text-[#A5AAA8]">
                Just a few details to get you started.
              </p>

            </div>

            {/* Register Card */}
            <AuthCard
              title=""
              subtitle=""
              footer={
                <span className="text-[#A5AAA8]">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-[#9C6B4E] transition hover:text-[#C28A68]"
                  >
                    Log in
                  </Link>
                </span>
              }
            >

              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-2.5"
              >

                {/* Name */}
                <Input
                  label="Name"
                  name="name"
                  icon={User}
                  placeholder="Your full name"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  error={errors.name}
                />

                {/* Email */}
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

                {/* Password */}
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  icon={Lock}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                />

                {/* Confirm Password */}
                <Input
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  icon={Lock}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                />

                {/* Error Message */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-[#B94F42]/20 bg-[#B94F42]/10 px-3 py-2 text-xs text-[#E58B80]"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Create Account Button */}
                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  <span className="inline-flex items-center gap-2">
                    Create account
                    <ArrowRight size={16} />
                  </span>
                </Button>

              </form>

            </AuthCard>

            {/* Bottom Text */}
            <p className="mt-3 text-center text-[10px] text-[#777E7B]">
              By joining Connectly, you're one step closer to meaningful connections.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
