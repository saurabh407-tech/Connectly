
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

let io;

// Tracks all active socket connections for each user.
const onlineSockets = new Map();

// Tracks active audio/video calls.
const activeCalls = new Map();

// Find an active call for a particular user.
const getActiveCallForUser = (userId) => {
  for (const [callId, call] of activeCalls.entries()) {
    if (call.callerId === userId || call.receiverId === userId) {
      return { callId, ...call };
    }
  }

  return null;
};

// Find the other participant in a call.
const getCallPeer = (call, userId) => {
  if (call.callerId === userId) return call.receiverId;
  if (call.receiverId === userId) return call.callerId;

  return null;
};

// Add a connected socket.
const addOnlineSocket = (userId, socketId) => {
  const sockets = onlineSockets.get(userId) || new Set();

  sockets.add(socketId);
  onlineSockets.set(userId, sockets);
};

// Remove a disconnected socket.
const removeOnlineSocket = (userId, socketId) => {
  const sockets = onlineSockets.get(userId);

  if (!sockets) return false;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineSockets.delete(userId);
    return true;
  }

  return false;
};

// Save call history in the conversation.
const saveCallHistory = async (call, status) => {
  try {
    if (!call.conversationId) {
      console.error('Call history error: conversation ID missing');
      return;
    }

    const duration =
      call.connectedAt && status === 'completed'
        ? Math.max(
            0,
            Math.floor((Date.now() - call.connectedAt) / 1000)
          )
        : 0;

    const callLabel =
      call.callType === 'video' ? 'Video call' : 'Audio call';

    let text = '';

    if (status === 'completed') {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;

      const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;

      text = `${callLabel} · ${formattedDuration}`;
    } else if (status === 'missed') {
      text = `Missed ${callLabel.toLowerCase()}`;
    } else if (status === 'rejected') {
      text = `${callLabel} rejected`;
    } else {
      text = `${callLabel} cancelled`;
    }

    const conversation = await Conversation.findById(
      call.conversationId
    );

    if (!conversation) {
      console.error('Call history error: conversation not found');
      return;
    }

    let message = await Message.create({
      conversation: call.conversationId,
      sender: call.callerId,
      text,
      readBy: [call.callerId],
      deliveredTo: [call.callerId],

      // These fields must exist in your Message model.
      type: 'call',
      callType: call.callType,
      callStatus: status,
      duration,
      callId: call.callId,
    });

    message = await message.populate(
      'sender',
      'name email avatar'
    );

    conversation.lastMessage = message._id;
    await conversation.save();

    // Send call history to both participants.
    conversation.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('new_message', message);
    });

    console.log(`Call history saved: ${call.callId} (${status})`);
  } catch (error) {
    console.error('Save call history error:', error.message);
  }
};

// Finish a call only once.
const finishCall = async (callId, userId, status) => {
  const call = activeCalls.get(callId);

  if (!call) return null;

  const isParticipant =
    call.callerId === userId || call.receiverId === userId;

  if (!isParticipant) return null;

  // Delete first to prevent duplicate history records.
  activeCalls.delete(callId);

  await saveCallHistory(call, status);

  return call;
};

export const initSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  // ==========================================
  // SOCKET AUTHENTICATION
  // ==========================================

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('_id name');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    console.log(`User connected: ${socket.user.name}`);

    // Join personal room.
    socket.join(userId);

    addOnlineSocket(userId, socket.id);

    // ==========================================
    // ONLINE STATUS
    // ==========================================

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { isOnline: true } },
        { new: true }
      ).select('isOnline lastSeen');

      io.emit('user_status', {
        userId,
        isOnline: true,
        lastSeen: updatedUser?.lastSeen,
      });
    } catch (error) {
      console.error('Online status update error:', error.message);
    }

    // ==========================================
    // JOIN / LEAVE CONVERSATION
    // ==========================================

    socket.on('join_conversation', async (conversationId) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          return;
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user._id,
        });

        if (conversation) {
          socket.join(conversationId.toString());
        }
      } catch (error) {
        console.error('Join conversation error:', error.message);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId.toString());
      }
    });

    // ==========================================
    // MESSAGE DELIVERED RECEIPT
    // ==========================================

    // Receiver acknowledges that a message reached their socket.
    socket.on('message:delivered', async ({ messageId } = {}) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
          return;
        }

        const message = await Message.findById(messageId);

        if (!message) return;

        // Sender cannot acknowledge their own message.
        if (message.sender.toString() === userId) {
          return;
        }

        // Verify that the receiver belongs to this conversation.
        const conversation = await Conversation.findOne({
          _id: message.conversation,
          participants: socket.user._id,
        });

        if (!conversation) return;

        const alreadyDelivered = message.deliveredTo?.some(
          (id) => id.toString() === userId
        );

        if (alreadyDelivered) return;

        await Message.updateOne(
          { _id: messageId },
          { $addToSet: { deliveredTo: socket.user._id } }
        );

        // Notify the original sender.
        io.to(message.sender.toString()).emit('message_delivered', {
          messageId: message._id.toString(),
          conversationId: message.conversation.toString(),
          deliveredTo: userId,
        });
      } catch (error) {
        console.error('Message delivered error:', error.message);
      }
    });

    // ==========================================
    // AUDIO / VIDEO CALLING
    // ==========================================

    // Start an audio or video call.
    socket.on(
      'call:invite',
      async ({ to, callId, callType = 'audio', conversationId } = {}) => {
        try {
          const receiverId = String(to || '');
          const id = String(callId || '');

          if (
            !mongoose.Types.ObjectId.isValid(receiverId) ||
            !mongoose.Types.ObjectId.isValid(conversationId) ||
            !id ||
            receiverId === userId ||
            !['audio', 'video'].includes(callType)
          ) {
            socket.emit('call:error', {
              message: 'Invalid call request.',
            });
            return;
          }

          if (activeCalls.has(id)) {
            socket.emit('call:error', {
              message: 'Invalid or duplicate call request.',
            });
            return;
          }

          if (getActiveCallForUser(userId)) {
            socket.emit('call:error', {
              message: 'You are already in a call.',
            });
            return;
          }

          if (getActiveCallForUser(receiverId)) {
            socket.emit('call:busy', { to: receiverId });
            return;
          }

          if (!onlineSockets.has(receiverId)) {
            socket.emit('call:error', {
              message: 'This user is offline.',
            });
            return;
          }

          // Both users must belong to this conversation.
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: {
              $all: [socket.user._id, receiverId],
            },
          });

          if (!conversation) {
            socket.emit('call:error', {
              message: 'Conversation not found.',
            });
            return;
          }

          const receiver = await User.findById(receiverId).select('_id');

          if (!receiver) {
            socket.emit('call:error', {
              message: 'User not found.',
            });
            return;
          }

          const call = {
            callId: id,
            callerId: userId,
            receiverId,
            conversationId: conversationId.toString(),
            callType,
            status: 'ringing',
            connectedAt: null,
          };

          activeCalls.set(id, call);

          console.log(
            `${callType.toUpperCase()} call started: ${userId} -> ${receiverId}`
          );

          io.to(receiverId).emit('call:incoming', {
            callId: id,
            caller: {
              id: userId,
              name: socket.user.name,
            },
            callType,
          });
        } catch (error) {
          console.error('Call invite error:', error.message);

          socket.emit('call:error', {
            message: 'Could not start the call.',
          });
        }
      }
    );

    // Receiver accepts the call.
    socket.on('call:accept', ({ callId } = {}) => {
      const id = String(callId || '');
      const call = activeCalls.get(id);

      if (
        !call ||
        call.receiverId !== userId ||
        call.status !== 'ringing'
      ) {
        return;
      }

      // Accepted does not necessarily mean WebRTC is connected.
      call.status = 'accepted';

      console.log(`Call accepted: ${id}`);

      io.to(call.callerId).emit('call:accepted', {
        callId: id,
      });
    });

    // A participant confirms that WebRTC is connected.
    socket.on('call:connected', ({ callId } = {}) => {
      const id = String(callId || '');
      const call = activeCalls.get(id);

      if (!call) return;

      if (
        call.callerId !== userId &&
        call.receiverId !== userId
      ) {
        return;
      }

      if (call.status !== 'accepted' && call.status !== 'connected') {
        return;
      }

      if (!call.connectedAt) {
        call.connectedAt = Date.now();
      }

      call.status = 'connected';

      console.log(`Call connected: ${id}`);
    });

    // Receiver rejects the call.
    socket.on('call:reject', async ({ callId } = {}) => {
      const id = String(callId || '');
      const call = activeCalls.get(id);

      if (
        !call ||
        call.receiverId !== userId ||
        call.status !== 'ringing'
      ) {
        return;
      }

      await finishCall(id, userId, 'rejected');

      console.log(`Call rejected: ${id}`);

      io.to(call.callerId).emit('call:rejected', {
        callId: id,
      });
    });

    // Either participant can end a call.
    socket.on('call:end', async ({ callId } = {}) => {
      const id = String(callId || '');
      const call = activeCalls.get(id);

      if (!call) return;

      const peerId = getCallPeer(call, userId);

      if (!peerId) return;

      let finalStatus = 'completed';

      if (call.status === 'ringing') {
        finalStatus =
          userId === call.callerId ? 'cancelled' : 'missed';
      }

      await finishCall(id, userId, finalStatus);

      console.log(`Call ended: ${id} (${finalStatus})`);

      io.to(peerId).emit('call:ended', {
        callId: id,
      });
    });

    // ==========================================
    // WEBRTC SIGNALING
    // ==========================================

    const relayCallSignal = (eventName, payload = {}) => {
      const id = String(payload.callId || '');
      const call = activeCalls.get(id);

      if (
        !call ||
        !['accepted', 'connected'].includes(call.status)
      ) {
        return;
      }

      const peerId = getCallPeer(call, userId);

      if (!peerId || !payload.signal) return;

      io.to(peerId).emit(eventName, {
        callId: id,
        signal: payload.signal,
      });
    };

    socket.on('webrtc:offer', (payload) => {
      relayCallSignal('webrtc:offer', payload);
    });

    socket.on('webrtc:answer', (payload) => {
      relayCallSignal('webrtc:answer', payload);
    });

    socket.on('webrtc:ice-candidate', (payload) => {
      relayCallSignal('webrtc:ice-candidate', payload);
    });

    // ==========================================
    // DISCONNECT / ONLINE STATUS
    // ==========================================

    socket.on('disconnect', async (reason) => {
      const shouldMarkOffline = removeOnlineSocket(userId, socket.id);

      // Only mark offline when the user's last socket disconnects.
      if (shouldMarkOffline) {
        try {
          const lastSeen = new Date();

          await User.findByIdAndUpdate(userId, {
            $set: {
              isOnline: false,
              lastSeen,
            },
          });

          // Check whether the user reconnected during the update.
          if (onlineSockets.has(userId)) {
            const updatedUser = await User.findByIdAndUpdate(
              userId,
              { $set: { isOnline: true } },
              { new: true }
            ).select('lastSeen');

            io.emit('user_status', {
              userId,
              isOnline: true,
              lastSeen: updatedUser?.lastSeen,
            });
          } else {
            io.emit('user_status', {
              userId,
              isOnline: false,
              lastSeen,
            });
          }
        } catch (error) {
          console.error('Offline status update error:', error.message);
        }

        // End the active call if the user's last socket disconnects.
        const activeCall = getActiveCallForUser(userId);

        if (activeCall) {
          const peerId = getCallPeer(activeCall, userId);

          let finalStatus = 'completed';

          if (activeCall.status === 'ringing') {
            finalStatus =
              userId === activeCall.callerId
                ? 'cancelled'
                : 'missed';
          }

          await finishCall(activeCall.callId, userId, finalStatus);

          if (peerId) {
            io.to(peerId).emit('call:ended', {
              callId: activeCall.callId,
            });
          }
        }
      }

      console.log(
        `User disconnected: ${socket.user.name} (${reason})`
      );
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }

  return io;
};
