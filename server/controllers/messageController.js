
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { getIO } from '../sockets/socket.js';

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
    })
      .populate('sender', 'name email avatar')
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

    let message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text,
      type: 'text',
      deliveredTo: [req.user._id],
      readBy: [req.user._id],
    });

    message = await message.populate('sender', 'name email avatar');

    conversation.lastMessage = message._id;
    await conversation.save();

    const io = getIO();

    // Send the new message to the other participants.
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
