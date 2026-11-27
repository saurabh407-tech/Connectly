
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { getIO } from '../sockets/socket.js';

const getVisibleLastMessage = (conversationId, userId) => Message.findOne({
  conversation: conversationId,
  deletedForEveryone: { $ne: true },
  deletedFor: { $ne: userId },
}).sort({ createdAt: -1 }).populate('sender', 'name email avatar');

// Get conversation messages.
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', 'name email avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name avatar' } })
      .populate('reactions.user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    messages.reverse();

    return res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};

// Send a text message.
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const text = req.body.text?.trim();
    const replyToId = req.body.replyTo || null;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 5000 characters',
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    if (replyToId && !await Message.exists({ _id: replyToId, conversation: conversationId })) {
      return res.status(400).json({ success: false, message: 'Reply message not found' });
    }

    let message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text,
      replyTo: replyToId,
      type: 'text',
      deliveredTo: [req.user._id],
      readBy: [req.user._id],
    });

    message = await message.populate('sender', 'name email avatar');
    message = await message.populate({ path: 'replyTo', populate: { path: 'sender', select: 'name avatar' } });

    conversation.lastMessage = message._id;
    await conversation.save();

    const io = getIO();

    // The sender receives the saved message in the HTTP response; broadcast only to peers.
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user._id.toString()) {
        io.to(participantId.toString()).emit('new_message', message);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

// Secure message actions. All changes are persisted before being broadcast.
export const messageAction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { action, emoji, text } = req.body;
    if (!mongoose.Types.ObjectId.isValid(messageId)) return res.status(400).json({ success: false, message: 'Invalid message ID' });
    const message = await Message.findById(messageId);
    if (!message || message.deletedForEveryone) return res.status(404).json({ success: false, message: 'Message not found' });
    const conversation = await Conversation.findOne({ _id: message.conversation, participants: req.user._id });
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const own = message.sender.toString() === req.user._id.toString();
    if (['edit', 'deleteEveryone'].includes(action) && !own) return res.status(403).json({ success: false, message: 'Only the sender can do that' });
    if (action === 'edit') {
      if (message.attachmentType || message.type === 'call') return res.status(400).json({ success: false, message: 'Attachments and call entries cannot be edited' });
      const updated = String(text || '').trim();
      if (!updated || updated.length > 5000) return res.status(400).json({ success: false, message: 'Message must contain 1 to 5000 characters' });
      message.text = updated; message.editedAt = new Date(); await message.save();
    } else if (action === 'deleteMe') {
      await Message.updateOne({ _id: messageId }, { $addToSet: { deletedFor: req.user._id } });
    } else if (action === 'deleteEveryone') {
      message.deletedForEveryone = true; message.text = 'This message was deleted'; message.attachment = {}; message.attachmentType = null; message.replyTo = null; message.reactions = []; message.starredBy = []; await message.save();
      await Conversation.updateOne({ _id: conversation._id }, { $pull: { pinnedMessages: message._id } });
      if (String(conversation.lastMessage || '') === String(message._id)) {
        const previousMessage = await Message.findOne({ conversation: conversation._id, deletedForEveryone: { $ne: true } }).sort({ createdAt: -1 }).select('_id');
        conversation.lastMessage = previousMessage?._id || null;
        await conversation.save();
      }
    } else if (action === 'react') {
      if (!['❤️','😂','👍','🔥','😮','😢','👏'].includes(emoji)) return res.status(400).json({ success: false, message: 'Unsupported reaction' });
      const existing = message.reactions.find((item) => item.user.toString() === req.user._id.toString());
      if (existing?.emoji === emoji) message.reactions = message.reactions.filter((item) => item.user.toString() !== req.user._id.toString());
      else { message.reactions = message.reactions.filter((item) => item.user.toString() !== req.user._id.toString()); message.reactions.push({ user: req.user._id, emoji }); }
      await message.save();
    } else if (action === 'star' || action === 'unstar') {
      await Message.updateOne({ _id: messageId }, action === 'star' ? { $addToSet: { starredBy: req.user._id } } : { $pull: { starredBy: req.user._id } });
    } else if (action === 'pin' || action === 'unpin') {
      await Conversation.updateOne({ _id: conversation._id }, action === 'pin' ? { $addToSet: { pinnedMessages: message._id } } : { $pull: { pinnedMessages: message._id } });
    } else return res.status(400).json({ success: false, message: 'Unknown action' });
    const fresh = await Message.findById(messageId).populate('sender', 'name email avatar').populate('reactions.user', 'name').populate({ path: 'replyTo', populate: { path: 'sender', select: 'name avatar' } });
    const lastMessage = ['deleteMe', 'deleteEveryone'].includes(action)
      ? await getVisibleLastMessage(conversation._id, req.user._id)
      : undefined;
    const payload = { action, message: fresh, messageId, conversationId: conversation._id.toString(), userId: req.user._id.toString(), pinnedMessages: action === 'pin' || action === 'unpin' || action === 'deleteEveryone' ? (await Conversation.findById(conversation._id)).pinnedMessages : undefined, ...(['deleteMe', 'deleteEveryone'].includes(action) ? { lastMessage: lastMessage || null } : {}) };
    const io = getIO();
    if (action === 'deleteMe' || action === 'star' || action === 'unstar') io.to(req.user._id.toString()).emit('message_action', payload);
    else if (action === 'deleteEveryone') {
      for (const participantId of conversation.participants) {
        const participantLastMessage = await getVisibleLastMessage(conversation._id, participantId);
        io.to(participantId.toString()).emit('message_action', { ...payload, userId: participantId.toString(), lastMessage: participantLastMessage || null });
      }
    } else conversation.participants.forEach((id) => io.to(id.toString()).emit('message_action', payload));
    return res.json({ success: true, data: payload });
  } catch (error) { next(error); }
};

export const getStarredMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ starredBy: req.user._id, deletedForEveryone: { $ne: true } }).populate('sender', 'name').populate('conversation', 'participants').sort({ updatedAt: -1 });
    return res.json({ success: true, data: { messages } });
  } catch (error) { next(error); }
};

// Mark received messages as seen.
export const markMessagesRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const readerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: readerId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Find unread messages before updating them.
    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: readerId },
      readBy: { $ne: readerId },
    }).select('_id sender');

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((message) => message._id) },
        },
        {
          $addToSet: {
            readBy: readerId,
            deliveredTo: readerId,
          },
        }
      );

      const messageIds = unreadMessages.map((message) =>
        message._id.toString()
      );

      const io = getIO();

      // Notify each sender that their messages were seen.
      const senderIds = [
        ...new Set(
          unreadMessages.map((message) => message.sender.toString())
        ),
      ];

      senderIds.forEach((senderId) => {
        io.to(senderId).emit('messages_read', {
          conversationId: conversationId.toString(),
          readBy: readerId.toString(),
          messageIds,
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: {
        modifiedCount: unreadMessages.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
