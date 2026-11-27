import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import uploadToCloudinary from '../utils/uploadToCloudinary.js';

export const uploadAttachment = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a file',
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

    const { mimetype, originalname, size, buffer } = req.file;

    let attachmentType;

    if (mimetype.startsWith('image/')) {
      attachmentType = 'image';
    } else if (mimetype.startsWith('audio/')) {
      attachmentType = 'audio';
    } else {
      attachmentType = 'document';
    }

    const cloudinaryResourceType =
      attachmentType === 'image' || mimetype === 'application/pdf'
        ? 'image'
        : 'raw';

    const uploadedFile = await uploadToCloudinary(
      buffer,
      `attachments/${attachmentType}`,
      cloudinaryResourceType
    );

    const replyToId = req.body.replyTo || null;
    if (replyToId && !await Message.exists({ _id: replyToId, conversation: conversationId })) {
      return res.status(400).json({ success: false, message: 'Reply message not found' });
    }
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: '',
      type: 'text',
      attachmentType,
      replyTo: replyToId,
      attachment: {
        url: uploadedFile.secure_url,
        publicId: uploadedFile.public_id,
        fileName: originalname,
        mimeType: mimetype,
        fileSize: size,
      },
      readBy: [req.user._id],
      deliveredTo: [req.user._id],
    });

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name email avatar').populate({ path: 'replyTo', populate: { path: 'sender', select: 'name avatar' } });
    conversation.lastMessage = message._id;
    await conversation.save();
    const { getIO } = await import('../sockets/socket.js');
    conversation.participants.forEach((id) => {
      if (id.toString() !== req.user._id.toString()) {
        getIO().to(id.toString()).emit('new_message', populatedMessage);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Attachment sent successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Upload attachment error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to upload attachment',
    });
  }
};
