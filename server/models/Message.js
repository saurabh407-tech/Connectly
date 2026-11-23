import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    // text = chat message, call = call history entry
    type: {
      type: String,
      enum: ['text', 'call'],
      default: 'text',
    },

    // Type of attachment for chat messages
    attachmentType: {
      type: String,
      enum: ['image', 'document', 'audio', 'voice', null],
      default: null,
    },

    // Uploaded file details
    attachment: {
      url: {
        type: String,
        default: null,
      },

      publicId: {
        type: String,
        default: null,
      },

      fileName: {
        type: String,
        default: null,
      },

      mimeType: {
        type: String,
        default: null,
      },

      fileSize: {
        type: Number,
        default: null,
      },
    },

    // Users who have received this message
    deliveredTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Users who have seen this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Call history fields
    callType: {
      type: String,
      enum: ['audio', 'video'],
    },

    callStatus: {
      type: String,
      enum: ['completed', 'missed', 'rejected', 'cancelled'],
    },

    duration: {
      type: Number,
      default: 0,
    },

    callId: {
      type: String,
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;