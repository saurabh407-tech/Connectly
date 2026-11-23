
import { create } from 'zustand';
import { userApi } from '../services/api.js';

const useUserStore = create((set) => ({
  users: [],
  loading: false,
  error: null,

  // Fetch registered users.
  fetchUsers: async (search = '') => {
    set({ loading: true, error: null });

    try {
      const { data } = await userApi.getUsers(search);
      const users = data.data.users;

      set({
        users,
        loading: false,
        error: null,
      });

      return users;
    } catch (error) {
      set({
        loading: false,
        error: error.message,
      });

      throw error;
    }
  },

  // Update a user's online/offline status in real time.
  updateUserStatus: ({ userId, isOnline, lastSeen }) => {
    set((state) => ({
      users: state.users.map((user) =>
        String(user._id) === String(userId)
          ? {
              ...user,
              isOnline,
              ...(lastSeen ? { lastSeen } : {}),
            }
          : user
      ),
    }));
  },

  // Clear users on logout.
  clearUsers: () => {
    set({
      users: [],
      loading: false,
      error: null,
    });
  },
}));

export default useUserStore;
