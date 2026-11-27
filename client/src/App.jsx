import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';

import ProtectedRoute from './routes/ProtectedRoute.jsx';
import GuestRoute from './routes/GuestRoute.jsx';

import useAuthStore from './store/authStore.js';
import { authApi } from './services/api.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

export default function App() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (hasHydrated) checkAuth();
  }, [hasHydrated, checkAuth]);

  useEffect(() => {
    if (!hasHydrated || !token || !isAuthenticated) return undefined;
    let active = true;
    const heartbeat = () => {
      authApi.keepSessionAlive().catch((error) => {
        if (active && error.response?.status === 401) checkAuth();
      });
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [hasHydrated, token, isAuthenticated, checkAuth]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#292A27] font-sans text-[#F4F1EA]">
        Loading Nexora...
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-ink-900 text-sm text-slate-300">Opening Nexora...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
