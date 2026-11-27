
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from 'lucide-react';

import Sidebar from '../components/chat/Sidebar.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';

import useAuthStore from '../store/authStore.js';
import useUserStore from '../store/userStore.js';
import useMessageStore from '../store/messageStore.js';
import useConversationStore from '../store/conversationStore.js';

import { authApi, conversationApi, messageApi } from '../services/api.js';

import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from '../services/socket.js';

import useAudioCall from '../hooks/useAudioCall.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export default function Dashboard() {
  useDocumentTitle('Chats');

  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const users = useUserStore((state) => state.users);
  const clearUsers = useUserStore((state) => state.clearUsers);

  const updateUserStatus = useUserStore(
    (state) => state.updateUserStatus
  );

  const fetchConversations = useConversationStore(
    (state) => state.fetchConversations
  );
  const upsertConversation = useConversationStore((state) => state.upsertConversation);

  const incrementUnread = useConversationStore(
    (state) => state.incrementUnread
  );

  const clearUnread = useConversationStore(
    (state) => state.clearUnread
  );

  const updateLastMessage = useConversationStore(
    (state) => state.updateLastMessage
  );

  const resetConversations = useConversationStore(
    (state) => state.resetConversations
  );

  const addIncomingMessage = useMessageStore(
    (state) => state.addIncomingMessage
  );

  const clearMessages = useMessageStore(
    (state) => state.clearMessages
  );

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [socket, setSocket] = useState(null);
  const selectionRequestRef = useRef(0);

  // Live call duration.
  const [callDuration, setCallDuration] = useState(0);

  const selectedConversationRef = useRef(null);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const {
    call,
    remoteStream,
    remoteAudioRef,
    localVideoRef,
    remoteVideoRef,
    muted,
    cameraOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useAudioCall(socket);

  // Fetch users and conversations.
  useEffect(() => {
    fetchUsers().catch((error) =>
      console.error('Failed to fetch users:', error.message)
    );

    fetchConversations().catch((error) =>
      console.error('Failed to fetch conversations:', error.message)
    );
  }, [fetchUsers, fetchConversations]);

  // Connect socket and listen for messages and presence updates.
  useEffect(() => {
    if (!token) return;

    const connectedSocket = connectSocket(token);

    if (!connectedSocket) return;

    setSocket(connectedSocket);

    // Handle incoming messages.
    const handleNewMessage = async (message) => {
      const conversationId = String(
        message.conversation?._id || message.conversation
      );

      // Update the latest message in the conversation list.
      updateLastMessage(message);

      // Acknowledge delivery as soon as the message is received.
      if (connectedSocket.connected && message._id) {
        connectedSocket.emit('message:delivered', {
          messageId: message._id,
        });
      }

      const activeConversation = selectedConversationRef.current;

      const isChatOpen =
        String(activeConversation?._id || '') === conversationId;

      if (isChatOpen) {
        // Add the incoming message to the currently open chat.
        addIncomingMessage(message);

        // Automatically mark it as seen because the chat is open.
        try {
          await messageApi.markRead(conversationId);
          clearUnread(conversationId);
        } catch (error) {
          console.error('Auto read failed:', error.message);
        }
      } else {
        // Increase unread count if the conversation is not open.
        incrementUnread(conversationId);
      }
    };

    // Handle online/offline status updates.
    const handleUserStatus = (status) => {
      updateUserStatus(status);

      setSelectedUser((current) => {
        if (
          !current ||
          String(current._id) !== String(status.userId)
        ) {
          return current;
        }

        return {
          ...current,
          isOnline: status.isOnline,
          ...(status.lastSeen
            ? { lastSeen: status.lastSeen }
            : {}),
        };
      });
    };

    // Handle delivered message updates.
    const handleMessageDelivered = (data) => {
      useMessageStore.getState().markMessageDelivered(data);
    };

    // Handle seen/read message updates.
    const handleMessagesRead = (data) => {
      useMessageStore.getState().markMessagesSeen({
        messageIds: data.messageIds || [],
        readBy: data.readBy,
      });
    };

    const handleMessageAction = (data) => {
      useMessageStore.getState().applyMessageAction(data);
      if (data.action === 'deleteEveryone' || data.action === 'deleteMe') {
        useConversationStore.getState().setLastMessage(data.conversationId, data.lastMessage);
      }
      if (data.action === 'pin' || data.action === 'unpin') {
        setSelectedConversation((current) => current && String(current._id) === String(data.conversationId) ? { ...current, pinnedMessages: data.pinnedMessages || [] } : current);
      }
    };

    // Register socket listeners.
    connectedSocket.on('new_message', handleNewMessage);
    connectedSocket.on('user_status', handleUserStatus);
    connectedSocket.on('message_delivered', handleMessageDelivered);
    connectedSocket.on('messages_read', handleMessagesRead);
    connectedSocket.on('message_action', handleMessageAction);

    // Remove listeners when the component unmounts or effect reruns.
    return () => {
      connectedSocket.off('new_message', handleNewMessage);
      connectedSocket.off('user_status', handleUserStatus);
      connectedSocket.off('message_delivered', handleMessageDelivered);
      connectedSocket.off('messages_read', handleMessagesRead);
      connectedSocket.off('message_action', handleMessageAction);

      setSocket(null);
      disconnectSocket();
    };
  }, [
    token,
    addIncomingMessage,
    updateLastMessage,
    incrementUnread,
    clearUnread,
    updateUserStatus,
  ]);

  // Join selected conversation room.
  useEffect(() => {
    const currentSocket = getSocket();

    if (!currentSocket || !selectedConversation?._id) return;

    const joinRoom = () => {
      currentSocket.emit(
        'join_conversation',
        selectedConversation._id
      );
    };

    if (currentSocket.connected) {
      joinRoom();
    } else {
      currentSocket.once('connect', joinRoom);
    }

    return () => {
      currentSocket.emit(
        'leave_conversation',
        selectedConversation._id
      );

      currentSocket.off('connect', joinRoom);
    };
  }, [selectedConversation?._id]);

  // Select user and open conversation.
  const handleSelectUser = async (selected, { syncHistory = false } = {}) => {
    const requestId = ++selectionRequestRef.current;
    if (!selected) {
      setSelectedUser(null);
      setSelectedConversation(null);
      setChatLoading(false);
      setChatError('');
      clearMessages();
      if (!syncHistory) navigate('/dashboard', { replace: true });
      return;
    }

    setSelectedUser(selected);
    setSelectedConversation(null);
    setChatLoading(true);
    setChatError('');
    clearMessages();

    try {
      const response =
        await conversationApi.createOrGet(selected._id);

      if (requestId !== selectionRequestRef.current) return;
      const conversation = response.data.data.conversation;

      setSelectedConversation(conversation);
      if (!syncHistory) navigate(`/dashboard?chat=${conversation._id}`);
      upsertConversation(conversation);
      clearUnread(conversation._id);
    } catch (error) {
      if (requestId === selectionRequestRef.current) setChatError(error.message);
    } finally {
      if (requestId === selectionRequestRef.current) setChatLoading(false);
    }
  };

  // A browser or phone Back action returns to the previous chat or to the list.
  useEffect(() => {
    const requestedId = new URLSearchParams(location.search).get('chat');
    if (!requestedId) {
      if (selectedConversation) {
        setSelectedUser(null);
        setSelectedConversation(null);
        clearMessages();
      }
      return;
    }
    if (String(selectedConversation?._id || '') === requestedId) return;
    const conversations = useConversationStore.getState().conversations;
    const conversation = conversations.find((item) => String(item._id) === requestedId);
    const peerId = conversation?.participants?.find((person) => String(person._id) !== String(user?._id))?._id;
    // The old URL remains in place until a newly selected profile resolves.
    // Don't let it cancel that in-flight selection and reopen the old chat.
    if (chatLoading && selectedUser) return;
    const peer = users.find((person) => String(person._id) === String(peerId));
    if (peer) handleSelectUser(peer, { syncHistory: true });
  }, [location.search, selectedConversation?._id, selectedUser?._id, chatLoading, users, user?._id]);

  // Logout.
  const handleLogout = async () => {
    if (call) {
      endCall();
    }

    await authApi.logout().catch(() => {});
    disconnectSocket();
    logout();
    clearUsers();
    clearMessages();
    resetConversations();

    setSelectedUser(null);
    setSelectedConversation(null);

    navigate('/login');
  };

  // Determine call type.
  const isVideoCall = call?.callType === 'video';

  // Call status text.
  const callStatusText = () => {
    if (call?.direction === 'incoming' && call.status === 'ringing') {
      return `Incoming ${isVideoCall ? 'video' : 'audio'} call...`;
    }

    if (call?.status === 'ringing') {
      return `Calling ${isVideoCall ? 'with video' : 'with audio'}...`;
    }

    if (call?.status === 'connected') {
      return `${isVideoCall ? 'Video' : 'Audio'} call connected`;
    }

    return `Connecting ${isVideoCall ? 'video' : 'audio'} call...`;
  };

  // Format call duration as MM:SS or HH:MM:SS.
  const formatCallDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return [
        hours,
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0'),
      ].join(':');
    }

    return [
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0'),
    ].join(':');
  };

  // Start timer only after the WebRTC connection is established.
  useEffect(() => {
    if (!call?.startedAt || call.status !== 'connected') {
      setCallDuration(0);
      return;
    }

    const updateDuration = () => {
      const seconds = Math.floor(
        (Date.now() - call.startedAt) / 1000
      );

      setCallDuration(seconds);
    };

    updateDuration();

    const timer = setInterval(updateDuration, 1000);

    return () => clearInterval(timer);
  }, [call?.startedAt, call?.status]);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        onSelectUser={handleSelectUser}
        chatOpen={Boolean(selectedUser)}
      />

      <ChatWindow
        selectedUser={selectedUser}
        selectedConversation={selectedConversation}
        conversationLoading={chatLoading}
        socket={socket}
        onStartAudioCall={(receiver) =>
          startCall(receiver, 'audio', selectedConversation?._id)
        }
        onStartVideoCall={(receiver) =>
          startCall(receiver, 'video', selectedConversation?._id)
        }
        onBack={() => {
          if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
          else handleSelectUser(null, { syncHistory: true });
        }}
        callActive={Boolean(call)}
        onOpenStarred={async (conversationId, messageId) => {
          try {
            const response = await conversationApi.getAll();
            const conversation = (response.data.data.conversations || []).find((item) => String(item._id) === String(conversationId));
            const peer = conversation?.participants?.find((participant) => String(participant._id) !== String(user?._id));
            if (peer) {
              await handleSelectUser(peer);
              window.setTimeout(() => document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
            }
          } catch (error) { console.error('Could not open starred message:', error.message); }
        }}
      />

      {/* Audio / Video call window */}
      {call && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div
            className={`w-full rounded-2xl border border-ink-600 bg-ink-800 p-5 shadow-2xl ${
              isVideoCall ? 'max-w-4xl' : 'max-w-sm'
            }`}
          >
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">
                {call.peerName}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {callStatusText()}
              </p>

              {/* Live call timer */}
              {call.status === 'connected' && (
                <p className="mt-2 text-lg font-semibold tabular-nums text-lagoon-400">
                  {formatCallDuration(callDuration)}
                </p>
              )}
            </div>

            {/* Video call interface */}
            {isVideoCall ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Remote video */}
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                  {remoteStream &&
                  remoteStream.getVideoTracks().length > 0 ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-48 items-center justify-center px-4 text-center text-sm text-slate-400">
                      {call.direction === 'incoming' &&
                      call.status === 'ringing'
                        ? 'Accept the call to connect.'
                        : 'Waiting for the other person’s video...'}
                    </div>
                  )}

                  <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                    {call.peerName}
                  </span>
                </div>

                {/* Local video */}
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />

                  {cameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-900 text-sm text-slate-300">
                      Camera is off
                    </div>
                  )}

                  <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                    You
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-lagoon-400/15 text-lagoon-400">
                  <Phone size={38} />
                </div>
              </div>
            )}

            {/* Remote audio playback */}
            <audio
              ref={remoteAudioRef}
              autoPlay
              playsInline
            />

            {/* Incoming call actions */}
            {call.direction === 'incoming' &&
            call.status === 'ringing' ? (
              <div className="mt-7 flex justify-center gap-6">
                <button
                  onClick={rejectCall}
                  className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label="Reject call"
                  title="Reject call"
                >
                  <PhoneOff />
                </button>

                <button
                  onClick={acceptCall}
                  className="grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white hover:bg-green-600"
                  aria-label="Accept call"
                  title="Accept call"
                >
                  <Phone />
                </button>
              </div>
            ) : (
              <div className="mt-7 flex justify-center gap-4">
                {/* Microphone */}
                <button
                  onClick={toggleMute}
                  className={`grid h-12 w-12 place-items-center rounded-full text-white ${
                    muted ? 'bg-red-500' : 'bg-ink-600'
                  }`}
                  aria-label={
                    muted ? 'Unmute microphone' : 'Mute microphone'
                  }
                  title={
                    muted ? 'Unmute microphone' : 'Mute microphone'
                  }
                >
                  {muted ? <MicOff /> : <Mic />}
                </button>

                {/* Camera */}
                {isVideoCall && (
                  <button
                    onClick={toggleCamera}
                    className={`grid h-12 w-12 place-items-center rounded-full text-white ${
                      cameraOff ? 'bg-red-500' : 'bg-ink-600'
                    }`}
                    aria-label={
                      cameraOff ? 'Turn camera on' : 'Turn camera off'
                    }
                    title={
                      cameraOff ? 'Turn camera on' : 'Turn camera off'
                    }
                  >
                    {cameraOff ? <VideoOff /> : <Video />}
                  </button>
                )}

                {/* End call */}
                <button
                  onClick={endCall}
                  className="grid h-12 w-12 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label="End call"
                  title="End call"
                >
                  <PhoneOff />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat error */}
      {chatError && (
        <div className="fixed bottom-5 right-5 rounded-xl bg-red-500 px-4 py-3 text-sm text-white">
          {chatError}
        </div>
      )}
    </div>
  );
}
