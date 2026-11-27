
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Automatically attach JWT token
api.interceptors.request.use((config) => {
  const authData = JSON.parse(
    sessionStorage.getItem('connectly-auth') || '{}'
  );

  const token = authData.state?.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auth APIs
export const authApi = {
  register: (data) => api.post('/auth/register', data),

  verifyEmailOTP: (data) =>
    api.post('/auth/verify-email-otp', data),

  login: (data) => api.post('/auth/login', data),

  me: () => api.get('/auth/me'),
  keepSessionAlive: () => api.post('/auth/session/heartbeat'),
  logout: () => api.post('/auth/logout'),

  updateProfile: (formData) => api.put('/auth/profile', formData),

  verifyProfileEmail: (otp) =>
    api.post('/auth/profile/verify-email', { otp }),

  changePassword: (payload) => api.post('/auth/change-password', payload),
};

// User APIs
export const userApi = {
  getUsers: (search = '') =>
    api.get(`/users?search=${encodeURIComponent(search)}`),
};

// Conversation APIs
export const conversationApi = {
  createOrGet: (receiverId) =>
    api.post(`/conversations/${receiverId}`),

  getAll: () => api.get('/conversations'),
};

// Message APIs
export const messageApi = {
  getMessages: (conversationId) =>
    api.get(`/messages/${conversationId}`),

  sendMessage: (conversationId, text, replyTo) =>
    api.post(`/messages/${conversationId}`, { text, replyTo }),

  // Upload image, document, audio or voice message
  uploadAttachment: (conversationId, formData, replyTo) => {
    if (replyTo) formData.append('replyTo', replyTo);
    return api.post(`/messages/upload/${conversationId}`, formData);
  },

  markRead: (conversationId) =>
    api.patch(`/messages/${conversationId}/read`),
  action: (messageId, action, payload = {}) => api.patch(`/messages/item/${messageId}`, { action, ...payload }),
  starred: () => api.get('/messages/starred'),
};

export default api;
