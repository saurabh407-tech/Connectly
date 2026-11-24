
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { authApi } from '../services/api.js';

const getPayload = (response) =>
  response.data?.data || response.data;

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      // App authentication and hydration states
      authChecking: true,
      hasHydrated: false,
      isAuthenticated: false,

      setHasHydrated: (value) =>
        set({ hasHydrated: value }),

      setUser: (user) => set({ user }),

      // Register: Create account and send OTP
      // Do not authenticate user at this stage
      register: async (payload) => {
        set({ loading: true });

        try {
          const response = await authApi.register(payload);
          const data = getPayload(response);

          // Ensure registration does not create an active session
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          });

          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Verify registration email OTP
      // Save JWT only after successful verification
      verifyEmailOTP: async (payload) => {
        set({ loading: true });

        try {
          const response = await authApi.verifyEmailOTP(payload);
          const data = getPayload(response);

          if (!data.token || !data.user) {
            throw new Error(
              'Invalid OTP verification response from server.'
            );
          }

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            loading: false,
            authChecking: false,
          });

          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Login
      login: async (payload) => {
        set({ loading: true });

        try {
          const response = await authApi.login(payload);
          const data = getPayload(response);

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: Boolean(data.token),
            loading: false,
            authChecking: false,
          });

          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Check existing authentication
      checkAuth: async () => {
        const token = get().token;

        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            authChecking: false,
          });

          return false;
        }

        set({ authChecking: true });

        try {
          const response = await authApi.me();
          const data = getPayload(response);
          const user = data.user || data;

          set({
            user,
            isAuthenticated: true,
            authChecking: false,
          });

          return true;
        } catch (error) {
          const status = error.response?.status;

          console.error(
            'Auth check error:',
            status || 'Network error',
            error.message
          );

          // Clear session only when server rejects the token
          if (status === 401 || status === 403) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              authChecking: false,
            });

            return false;
          }

          // Preserve session during network/server errors
          set({
            isAuthenticated: true,
            authChecking: false,
          });

          return true;
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          authChecking: false,
          loading: false,
        });
      },
    }),

    {
      name: 'connectly-auth',
      storage: createJSONStorage(() => sessionStorage),

      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Auth hydration error:', error);
        }

        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;
