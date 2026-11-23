import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const verifyEmailOTP = useAuthStore((state) => state.verifyEmailOTP);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please register again to verify your email.');
      navigate('/register');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast.error('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      await verifyEmailOTP({ email, otp });
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'OTP verification failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">
          Verify your email
        </h1>

        <p className="mb-6 text-sm text-gray-400">
          We sent a 6-digit verification code to {email || 'your email'}.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-2 block text-sm text-gray-300">
            Enter OTP
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ''))
            }
            placeholder="Enter 6-digit OTP"
            className="mb-5 w-full rounded-lg border border-ink-700 bg-ink-800 px-4 py-3 text-center text-lg tracking-[0.4em] text-white outline-none focus:border-lagoon-400"
          />

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-lagoon-500 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          Wrong email?{' '}
          <Link to="/register" className="text-lagoon-400 hover:underline">
            Register again
          </Link>
        </p>
      </div>
    </div>
  );
}