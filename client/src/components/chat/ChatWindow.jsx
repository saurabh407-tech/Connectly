
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  MessagesSquare,
  Send,
  Circle,
  Phone,
  Video,
  PhoneMissed,
  Check,
  CheckCheck,
  Paperclip,
  Image,
  FileText,
  Music,
  Mic,
  Square,
  Download,
  ExternalLink,
  X,
} from 'lucide-react';

import Avatar from '../common/Avatar.jsx';
import useAuthStore from '../../store/authStore.js';
import useMessageStore from '../../store/messageStore.js';
import useConversationStore from '../../store/conversationStore.js';
import { messageApi } from '../../services/api.js';

const getId = (value) => {
  if (!value) return '';
  return String(value._id || value.id || value);
};

const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function ChatWindow({
  selectedUser,
  selectedConversation,
  socket,
  onStartAudioCall,
  onStartVideoCall,
  onBack,
  callActive,
}) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);

  const currentUser = useAuthStore((state) => state.user);

  const messages = useMessageStore((state) => state.messages);
  const loading = useMessageStore((state) => state.loading);
  const sending = useMessageStore((state) => state.sending);
  const error = useMessageStore((state) => state.error);

  const fetchMessages = useMessageStore((state) => state.fetchMessages);
  const sendMessage = useMessageStore((state) => state.sendMessage);
  const uploadAttachment = useMessageStore(
    (state) => state.uploadAttachment
  );
  const clearMessages = useMessageStore((state) => state.clearMessages);
  const markMessagesSeen = useMessageStore(
    (state) => state.markMessagesSeen
  );

  const clearUnread = useConversationStore((state) => state.clearUnread);

  const conversationId = selectedConversation?._id;
  const currentUserId = getId(currentUser);

  // Load messages whenever the selected conversation changes.
  useEffect(() => {
    setText('');

    if (!conversationId) {
      clearMessages();
      return;
    }

    let cancelled = false;

    const loadChat = async () => {
      const loadedMessages = await fetchMessages(conversationId);

      if (cancelled) return;

      // Acknowledge incoming messages as delivered.
      loadedMessages.forEach((message) => {
        const senderId = getId(message.sender);

        if (senderId !== currentUserId && socket?.connected) {
          socket.emit('message:delivered', {
            messageId: message._id,
          });
        }
      });

      try {
        await messageApi.markRead(conversationId);

        if (cancelled) return;

        const seenIds = loadedMessages
          .filter((message) => getId(message.sender) !== currentUserId)
          .map((message) => message._id);

        if (seenIds.length) {
          markMessagesSeen({
            messageIds: seenIds,
            readBy: currentUserId,
          });
        }

        clearUnread(conversationId);
      } catch (error) {
        console.error('Mark read failed:', error.message);
      }
    };

    loadChat();

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    currentUserId,
    socket,
    fetchMessages,
    clearMessages,
    clearUnread,
    markMessagesSeen,
  ]);

  // Acknowledge incoming messages that arrive while this chat is open.
  useEffect(() => {
    if (!conversationId || !messages.length) return;

    const incomingUnread = messages.filter((message) => {
      const senderId = getId(message.sender);
      const readBy = (message.readBy || []).map(getId);

      return (
        senderId !== currentUserId &&
        !readBy.includes(currentUserId)
      );
    });

    if (!incomingUnread.length) return;

    incomingUnread.forEach((message) => {
      if (socket?.connected) {
        socket.emit('message:delivered', {
          messageId: message._id,
        });
      }
    });

    let cancelled = false;

    const markSeen = async () => {
      try {
        await messageApi.markRead(conversationId);

        if (cancelled) return;

        markMessagesSeen({
          messageIds: incomingUnread.map((message) => message._id),
          readBy: currentUserId,
        });

        clearUnread(conversationId);
      } catch (error) {
        console.error(
          'Mark incoming messages read failed:',
          error.message
        );
      }
    };

    markSeen();

    return () => {
      cancelled = true;
    };
  }, [
    messages,
    conversationId,
    currentUserId,
    socket,
    markMessagesSeen,
    clearUnread,
  ]);

  // Scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop microphone tracks when the component unmounts.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  // Send normal text message.
  const handleSend = async (event) => {
    event.preventDefault();

    const messageText = text.trim();

    if (!messageText || !conversationId || sending) return;

    try {
      await sendMessage(conversationId, messageText);
      setText('');
    } catch (err) {
      console.error('Message sending failed:', err.message);
    }
  };

  // Upload an image, document or audio file.
  const handleAttachmentUpload = async (file, attachmentType) => {
    if (!file || !conversationId || sending) return;

    setAttachmentError('');

    const maxSize = 15 * 1024 * 1024;

    if (file.size > maxSize) {
      setAttachmentError('File size must be less than 15 MB.');
      return;
    }

    try {
      await uploadAttachment(
        conversationId,
        file,
        attachmentType
      );
    } catch (err) {
      setAttachmentError(
        err.response?.data?.message || 'File upload failed.'
      );
      console.error('Attachment upload failed:', err);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      handleAttachmentUpload(file, 'image');
    }

    event.target.value = '';
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      handleAttachmentUpload(file, 'document');
    }

    event.target.value = '';
  };

  const handleAudioChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      handleAttachmentUpload(file, 'audio');
    }

    event.target.value = '';
  };

  // Start recording a voice message.
  const startRecording = async () => {
    if (!conversationId || sending) return;

    setAttachmentError('');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Microphone recording is not supported in this browser.'
        );
      }

      if (!window.MediaRecorder) {
        throw new Error(
          'Voice recording is not supported in this browser.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = '';

      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const actualMimeType =
          recorder.mimeType || 'audio/webm';

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });

        // Release the microphone.
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (audioBlob.size > 0) {
          const extension = actualMimeType.includes('mp4')
            ? 'mp4'
            : 'webm';

          const voiceFile = new File(
            [audioBlob],
            `voice-message.${extension}`,
            { type: actualMimeType }
          );

          await handleAttachmentUpload(voiceFile, 'voice');
        }

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      mediaStreamRef.current = null;
      setRecording(false);

      setAttachmentError(
        err.message || 'Could not access your microphone.'
      );
    }
  };

  // Stop and send the current voice recording.
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  };

  if (!selectedUser) {
    return (
      <section className="hidden flex-1 flex-col items-center justify-center bg-[#F4F1EA] px-6 text-center md:flex">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#E8E3DA] text-[#9C6B4E]">
          <MessagesSquare size={30} />
        </span>

        <h2 className="mt-5 text-xl font-bold text-[#292A27]">
          Welcome to Connectly
        </h2>

        <p className="mt-2 max-w-sm text-sm text-[#77786F]">
          Select a person to start chatting.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[#F4F1EA]">
      {/* Chat header */}
      <header className="flex items-center gap-3 border-b border-[#D8D1C6] bg-[#E8E3DA] px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#292A27] hover:bg-[#D8D1C6] md:hidden"
          aria-label="Back to people"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar
          name={selectedUser.name}
          src={selectedUser.avatar}
          online={selectedUser.isOnline}
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[#292A27]">
            {selectedUser.name}
          </h2>

          <div className="flex items-center gap-1.5">
            <Circle
              size={8}
              fill="currentColor"
              className={
                selectedUser.isOnline
                  ? 'text-[#53665A]'
                  : 'text-[#929188]'
              }
            />

            <span className="text-xs text-[#77786F]">
              {selectedUser.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Audio call */}
        <button
          type="button"
          onClick={() => onStartAudioCall?.(selectedUser, 'audio')}
          disabled={callActive || !selectedUser.isOnline}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#D5CEC3] text-[#9C6B4E] transition hover:bg-[#C9C1B5] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start audio call"
          title="Audio call"
        >
          <Phone size={18} />
        </button>

        {/* Video call */}
        <button
          type="button"
          onClick={() => onStartVideoCall?.(selectedUser, 'video')}
          disabled={callActive || !selectedUser.isOnline}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#B87959] text-[#F8F5EF] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start video call"
          title="Video call"
        >
          <Video size={18} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#F4F1EA] px-5 py-6">
        {loading && (
          <p className="m-auto text-sm text-[#77786F]">
            Loading messages...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <div className="m-auto text-center">
            <MessagesSquare
              size={38}
              className="mx-auto text-[#929188]"
            />

            <p className="mt-3 font-medium text-[#292A27]">
              No messages yet
            </p>

            <p className="mt-1 text-sm text-[#77786F]">
              Send a message to start the conversation.
            </p>
          </div>
        )}

        {!loading &&
          messages.map((message) => {
            const senderId = getId(message.sender);
            const isOwnMessage = senderId === currentUserId;

            // Call history message.
            if (message.type === 'call') {
              const isVideo = message.callType === 'video';
              const missed = ['missed', 'rejected'].includes(
                message.callStatus
              );

              return (
                <div
                  key={message._id}
                  className="flex justify-center py-2"
                >
                  <div className="flex min-w-[230px] items-center gap-3 rounded-xl border border-[#D8D1C6] bg-[#E8E3DA] px-4 py-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full ${
                        missed
                          ? 'bg-[#B94F42]/10 text-[#B94F42]'
                          : 'bg-[#B87959]/10 text-[#9C6B4E]'
                      }`}
                    >
                      {missed ? (
                        <PhoneMissed size={19} />
                      ) : isVideo ? (
                        <Video size={19} />
                      ) : (
                        <Phone size={19} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#292A27]">
                        {isVideo ? 'Video call' : 'Audio call'}
                      </p>

                      <p className="text-xs text-[#77786F]">
                        {message.callStatus === 'completed'
                          ? `Completed · ${formatDuration(message.duration)}`
                          : message.callStatus === 'missed'
                            ? 'Missed call'
                            : message.callStatus === 'rejected'
                              ? 'Call rejected'
                              : 'Call cancelled'}
                      </p>

                      <p className="mt-1 text-[10px] text-[#929188]">
                        {new Date(message.createdAt).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            const deliveredTo = (message.deliveredTo || []).map(getId);
            const readBy = (message.readBy || []).map(getId);

            const isDelivered = deliveredTo.some(
              (id) => id !== currentUserId
            );

            const isSeen = readBy.some(
              (id) => id !== currentUserId
            );

            const attachment = message.attachment;
            const attachmentType = message.attachmentType;
            const attachmentUrl = attachment?.url;
            const isPdf =
              attachment?.mimeType === 'application/pdf' ||
              attachment?.fileName?.toLowerCase().endsWith('.pdf');

            return (
              <div
                key={message._id}
                className={`flex w-full ${
                  isOwnMessage ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] min-w-[110px] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwnMessage
                      ? 'rounded-br-sm bg-[#B87959] text-[#F8F5EF]'
                      : 'rounded-bl-sm border border-[#D8D1C6] bg-[#E8E3DA] text-[#292A27]'
                  }`}
                >
                  {/* Text content */}
                  {message.text && (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.text}
                    </p>
                  )}

                  {/* Image attachment */}
                  {attachmentType === 'image' && attachmentUrl && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block"
                    >
                      <img
                        src={attachmentUrl}
                        alt={attachment?.fileName || 'Shared image'}
                        loading="lazy"
                        className="max-h-72 max-w-full rounded-lg object-contain"
                      />
                    </a>
                  )}

                  {/* Audio file or voice message */}
                  {(attachmentType === 'audio' ||
                    attachmentType === 'voice') &&
                    attachmentUrl && (
                      <div className="mt-2 min-w-[220px]">
                        <p className="mb-1 flex items-center gap-2 text-xs font-medium">
                          <Music size={15} />
                          {attachmentType === 'voice'
                            ? 'Voice message'
                            : attachment?.fileName || 'Audio file'}
                        </p>

                        <audio
                          controls
                          preload="metadata"
                          className="w-full"
                          src={attachmentUrl}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}

                  {/* Document attachment */}
                  {attachmentType === 'document' && attachmentUrl && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex items-center gap-3 rounded-lg border border-black/10 bg-black/5 p-3 transition hover:bg-black/10"
                    >
                      <FileText size={28} className="shrink-0" />

                      <div className="min-w-0 flex-1">
                        <p className="break-all text-xs font-semibold">
                          {attachment?.fileName || 'Document'}
                        </p>

                        <p className="text-[10px] opacity-70">
                          {attachment?.fileSize
                            ? `${(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB`
                            : 'File attachment'}
                        </p>
                      </div>

                      {isPdf ? (
                        <ExternalLink size={18} className="shrink-0" />
                      ) : (
                        <Download size={18} className="shrink-0" />
                      )}
                    </a>
                  )}

                  {/* Message time and receipts */}
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <span
                      className={`text-[10px] ${
                        isOwnMessage
                          ? 'text-[#77786F]'
                          : 'text-[#77786F]'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>

                    {isOwnMessage &&
                      (isSeen ? (
                        <CheckCheck
                          size={16}
                          className="text-[#53665A]"
                          aria-label="Seen"
                          title="Seen"
                        />
                      ) : isDelivered ? (
                        <CheckCheck
                          size={16}
                          className="text-[#8F6046]"
                          aria-label="Delivered"
                          title="Delivered"
                        />
                      ) : (
                        <Check
                          size={15}
                          className="text-[#8F6046]"
                          aria-label="Sent"
                          title="Sent"
                        />
                      ))}
                  </div>
                </div>
              </div>
            );
          })}

        <div ref={bottomRef} />
      </div>

      {/* Error messages */}
      {(error || attachmentError) && (
        <div className="flex items-center justify-between gap-3 px-5 py-2 text-sm text-[#B94F42]">
          <span>{attachmentError || error}</span>

          {attachmentError && (
            <button
              type="button"
              onClick={() => setAttachmentError('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageChange}
      />

      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
        onChange={handleDocumentChange}
      />

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        className="hidden"
        onChange={handleAudioChange}
      />

      {/* Message input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-[#D8D1C6] bg-[#E8E3DA] px-4 py-3"
      >
        {/* Image picker */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={sending || !conversationId}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#9C6B4E] transition hover:bg-[#D5CEC3] disabled:opacity-40"
          title="Send image"
          aria-label="Send image"
        >
          <Image size={19} />
        </button>

        {/* Document picker */}
        <button
          type="button"
          onClick={() => documentInputRef.current?.click()}
          disabled={sending || !conversationId}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#9C6B4E] transition hover:bg-[#D5CEC3] disabled:opacity-40"
          title="Send document"
          aria-label="Send document"
        >
          <Paperclip size={19} />
        </button>

        {/* Audio picker */}
        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          disabled={sending || !conversationId}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#9C6B4E] transition hover:bg-[#D5CEC3] disabled:opacity-40"
          title="Send audio"
          aria-label="Send audio"
        >
          <Music size={19} />
        </button>

        {/* Voice recording */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={sending || !conversationId}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${
            recording
              ? 'bg-[#B94F42] text-[#292A27] hover:bg-[#9F4137]'
              : 'text-[#9C6B4E] hover:bg-[#D5CEC3]'
          }`}
          title={recording ? 'Stop and send voice message' : 'Record voice message'}
          aria-label={recording ? 'Stop recording' : 'Record voice message'}
        >
          {recording ? <Square size={17} /> : <Mic size={19} />}
        </button>

        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            recording ? 'Recording voice message...' : 'Type a message...'
          }
          maxLength={5000}
          disabled={recording}
          className="min-w-0 flex-1 rounded-full border border-[#D8D1C6] bg-[#F4F1EA] px-5 py-3 text-sm text-[#292A27] outline-none placeholder:text-[#929188] focus:border-[#9C6B4E] disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!text.trim() || sending || !conversationId || recording}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#B87959] text-[#F8F5EF] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>

      {sending && (
        <p className="bg-[#E8E3DA] pb-2 text-center text-xs text-[#77786F]">
          Uploading or sending...
        </p>
      )}
    </section>
  );
}
