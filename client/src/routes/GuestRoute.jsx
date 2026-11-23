
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

export default function GuestRoute() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const authChecking = useAuthStore((state) => state.authChecking);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  if (!hasHydrated || authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-900 text-white">
        Loading...
      </div>
    );
  }

  if (token && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
