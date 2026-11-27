
import { create } from 'zustand';
import { conversationApi } from '../services/api.js';

const useConversationStore = create((set, get) => ({
  conversations: [],
  loading: false,
  error: null,

  fetchConversations: async () => {
    set({ loading: true, error: null });

    try {
      const response = await conversationApi.getAll();
      const conversations = response.data.data.conversations || [];

      set({ conversations, loading: false });
      return conversations;
    } catch (error) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  upsertConversation: (conversation) => set((state) => {
    const existing = state.conversations.find((item) => String(item._id) === String(conversation._id));
    const merged = existing
      ? { ...existing, ...conversation, lastMessage: conversation.lastMessage, unreadCount: existing.unreadCount || 0 }
      : { ...conversation, unreadCount: 0 };
    return {
      conversations: [merged, ...state.conversations.filter((item) => String(item._id) !== String(conversation._id))]
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    };
  }),

  incrementUnread: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) => {
        if (String(conversation._id) !== String(conversationId)) {
          return conversation;
        }

        return {
          ...conversation,
          unreadCount: (conversation.unreadCount || 0) + 1,
          lastMessage: message,
          updatedAt: message.createdAt,
        };
      }),
    }));
  },

  clearUnread: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        String(conversation._id) === String(conversationId)
          ? { ...conversation, unreadCount: 0 }
          : conversation
      ),
    }));
  },

  updateLastMessage: (message) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        String(conversation._id) === String(message.conversation)
          ? {
              ...conversation,
              lastMessage: message,
              updatedAt: message.createdAt,
            }
          : conversation
      ),
    }));
  },

  setLastMessage: (conversationId, lastMessage) => set((state) => ({
    conversations: state.conversations.map((conversation) => String(conversation._id) === String(conversationId)
      ? { ...conversation, lastMessage: lastMessage || null }
      : conversation),
  })),

  resetConversations: () => set({
    conversations: [],
    loading: false,
    error: null,
  }),
}));

export default useConversationStore;
