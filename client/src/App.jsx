import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';

import ProtectedRoute from './routes/ProtectedRoute.jsx';
import GuestRoute from './routes/GuestRoute.jsx';

import useAuthStore from './store/authStore.js';

export default function App() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (hasHydrated) checkAuth();
  }, [hasHydrated, checkAuth]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#292A27] font-sans text-[#F4F1EA]">
        Loading Nexora...
      </div>
    );
  }

  return (
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
  );
}
