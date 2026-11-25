import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="relative isolate h-dvh overflow-hidden bg-[#EAF0FC] px-3 py-2 font-sans text-[#253451] sm:px-5 sm:py-3">
      <div className="pointer-events-none absolute -left-44 -top-48 h-[31rem] w-[31rem] rounded-full border-[18px] border-white/45 bg-gradient-to-br from-white/80 to-[#D9E5FF]/70 shadow-[inset_-12px_-12px_32px_rgba(111,145,220,0.18),18px_18px_55px_rgba(91,123,191,0.16)]" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[28rem] w-[28rem] rounded-full border-[14px] border-white/50 bg-gradient-to-br from-[#DDE8FF]/70 to-white/70 shadow-[inset_12px_12px_32px_rgba(111,145,220,0.13),-15px_-15px_50px_rgba(255,255,255,0.8)]" />
      <div className="pointer-events-none absolute right-[8%] top-[16%] h-24 w-24 rounded-full border border-white/80 bg-white/25 shadow-[inset_5px_5px_16px_rgba(126,151,201,0.15),8px_8px_25px_rgba(102,132,191,0.13)]" />

      <main className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <aside className="relative hidden h-full min-h-0 flex-col justify-between overflow-hidden rounded-[36px] border border-white/75 bg-gradient-to-br from-white/55 via-[#E5EDFC]/60 to-[#DCE7FA]/80 p-8 shadow-[16px_20px_48px_rgba(91,117,171,0.15),-10px_-10px_32px_rgba(255,255,255,0.8)] backdrop-blur-xl lg:flex">
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/90 bg-gradient-to-br from-white to-[#E3EBFB] text-blue-600 shadow-[7px_7px_18px_rgba(105,130,181,0.17),-6px_-6px_16px_rgba(255,255,255,0.9)]">
                <MessageCircle size={22} strokeWidth={2.4} />
              </span>
              <span className="text-xl font-extrabold tracking-tight text-[#243451]">Nexora</span>
            </Link>

            <div className="mt-12 max-w-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> A space to connect
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-[#1D2E4D]">
                Your next conversation starts here.
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#657694]">
                Create your account and bring your conversations, calls and shared moments together.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/45 p-4 shadow-[inset_3px_3px_9px_rgba(142,158,190,0.12),inset_-3px_-3px_9px_rgba(255,255,255,0.75)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100/80 text-blue-700">
              <ShieldCheck size={21} />
            </span>
            <p className="text-xs leading-5 text-[#5F6F8A]">
              A simple, welcoming place to stay close to the people who matter.
            </p>
          </div>

          <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full border border-white/70" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-40 w-40 rounded-full border border-white/70" />
        </aside>

        <section className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col justify-center py-0">
          <Link to="/" className="mx-auto mb-2 flex w-fit items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/90 bg-gradient-to-br from-white to-[#E3EBFB] text-blue-600 shadow-[7px_7px_18px_rgba(105,130,181,0.17),-6px_-6px_16px_rgba(255,255,255,0.9)]">
              <MessageCircle size={22} strokeWidth={2.4} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#243451]">Nexora</span>
          </Link>

          <div className="rounded-[28px] border border-white/80 bg-white/40 p-3 shadow-[14px_18px_40px_rgba(91,117,171,0.16),-10px_-10px_32px_rgba(255,255,255,0.8)] backdrop-blur-xl sm:rounded-[34px] sm:p-6 md:p-7">
            <div className="mb-3">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-blue-700">Join Nexora</p>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1D2E4D] sm:text-2xl">Create your account</h2>
              <p className="mt-2 text-sm leading-6 text-[#667796]">A few details and you’ll be ready to connect.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-2">
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
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
              />

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

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" size="lg" loading={loading} className="w-full rounded-2xl py-2.5 text-sm">
                <span className="inline-flex items-center gap-2">
                  Create account <ArrowRight size={18} />
                </span>
              </Button>
            </form>

            <p className="mt-2 border-t border-white/70 pt-2 text-center text-xs text-[#667796] sm:mt-3 sm:pt-3 sm:text-sm">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-blue-700 transition hover:text-indigo-700">
                Log in
              </Link>
            </p>
          </div>

          <p className="mt-2 text-center text-[9px] leading-4 text-[#7887A2] sm:mt-3 sm:text-[10px]">
            Your Nexora account helps you keep meaningful conversations close.
          </p>
        </section>
      </main>
    </div>
  );
}
