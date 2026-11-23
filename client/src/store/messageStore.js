
import { create } from 'zustand';
import { messageApi } from '../services/api.js';

const useMessageStore = create((set, get) => ({
  messages: [],
  loading: false,
  sending: false,
  error: null,
  currentConversationId: null,

  // Fetch conversation messages
  fetchMessages: async (conversationId) => {
    set({
      loading: true,
      error: null,
      currentConversationId: conversationId,
      messages: [],
    });

    try {
      const response = await messageApi.getMessages(conversationId);

      if (
        String(get().currentConversationId) !== String(conversationId)
      ) {
        return [];
      }

      const messages = response.data.data.messages || [];

      set({
        messages,
        loading: false,
      });

      return messages;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.message,
      });

      return [];
    }
  },

  // Send normal text message
  sendMessage: async (conversationId, text) => {
    set({ sending: true, error: null });

    try {
      const response = await messageApi.sendMessage(conversationId, text);
      const message = response.data.data.message;

      if (
        String(get().currentConversationId) === String(conversationId)
      ) {
        get().addIncomingMessage(message);
      }

      set({ sending: false });

      return message;
    } catch (error) {
      set({
        sending: false,
        error: error.response?.data?.message || error.message,
      });

      throw error;
    }
  },

  // Upload image, document, audio or voice message
  uploadAttachment: async (conversationId, file, attachmentType = '') => {
    set({ sending: true, error: null });

    try {
      const formData = new FormData();

      // Backend Multer expects the field name "file"
      formData.append('file', file);

      // Used by backend to distinguish voice recordings
      if (attachmentType) {
        formData.append('attachmentType', attachmentType);
      }

      const response = await messageApi.uploadAttachment(
        conversationId,
        formData
      );

      // Supports either a direct message response or { message: ... }
      const message =
        response.data.data.message || response.data.data;

      if (
        String(get().currentConversationId) === String(conversationId)
      ) {
        get().addIncomingMessage(message);
      }

      set({ sending: false });

      return message;
    } catch (error) {
      set({
        sending: false,
        error: error.response?.data?.message || error.message,
      });

      throw error;
    }
  },

  // Add incoming message without duplicates
  addIncomingMessage: (message) => {
    const { currentConversationId, messages } = get();

    if (
      String(currentConversationId) !==
      String(message.conversation?._id || message.conversation)
    ) {
      return;
    }

    if (messages.some((item) => item._id === message._id)) {
      return;
    }

    set({
      messages: [...messages, message],
    });
  },

  // Update delivery receipt
  markMessageDelivered: ({ messageId, deliveredTo }) => {
    set((state) => ({
      messages: state.messages.map((message) => {
        if (String(message._id) !== String(messageId)) {
          return message;
        }

        const existing = message.deliveredTo || [];

        if (
          existing.some((id) => String(id) === String(deliveredTo))
        ) {
          return message;
        }

        return {
          ...message,
          deliveredTo: [...existing, deliveredTo],
        };
      }),
    }));
  },

  // Update read receipt
  markMessagesSeen: ({ messageIds, readBy }) => {
    const ids = new Set((messageIds || []).map(String));

    set((state) => ({
      messages: state.messages.map((message) => {
        if (!ids.has(String(message._id))) {
          return message;
        }

        const existing = message.readBy || [];

        if (existing.some((id) => String(id) === String(readBy))) {
          return message;
        }

        return {
          ...message,
          readBy: [...existing, readBy],
        };
      }),
    }));
  },

  // Update receipt information after fetching messages
  updateMessageReceipts: (messages) => {
    set((state) => {
      const updates = new Map(
        messages.map((message) => [String(message._id), message])
      );

      return {
        messages: state.messages.map((message) => {
          const updated = updates.get(String(message._id));
          return updated ? { ...message, ...updated } : message;
        }),
      };
    });
  },

  // Clear messages when changing conversations or logging out
  clearMessages: () =>
    set({
      messages: [],
      loading: false,
      sending: false,
      error: null,
      currentConversationId: null,
    }),
}));

export default useMessageStore;
