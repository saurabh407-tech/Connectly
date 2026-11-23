
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

// Create or get one-to-one conversation
export const createConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot chat with yourself',
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiverId], $size: 2 },
    }).populate('participants', 'name email avatar isOnline');

    if (conversation) {
      return res.status(200).json({
        success: true,
        message: 'Conversation already exists',
        data: { conversation },
      });
    }

    conversation = await Conversation.create({
      participants: [senderId, receiverId],
    });

    await conversation.populate(
      'participants',
      'name email avatar isOnline'
    );

    return res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

// Get all conversations of logged-in user
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name',
        },
      })
      .sort({ updatedAt: -1 });

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        });

        return {
          ...conversation.toObject(),
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully',
      data: { conversations: result },
    });
  } catch (error) {
    next(error);
  }
};
