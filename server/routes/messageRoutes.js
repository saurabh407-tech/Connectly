import { Router } from 'express';

import {
  getMessages,
  sendMessage,
  markMessagesRead,
  messageAction,
  getStarredMessages,
} from '../controllers/messageController.js';

import { uploadAttachment } from '../controllers/attachmentController.js';

import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/starred', protect, getStarredMessages);
router.patch('/item/:messageId', protect, messageAction);

// Get all messages
router.get('/:conversationId', protect, getMessages);

// Send normal text message
router.post('/:conversationId', protect, sendMessage);

// Upload image, document or audio attachment
router.post(
  '/upload/:conversationId',
  protect,
  upload.single('file'),
  uploadAttachment
);

// Mark messages as read
router.patch('/:conversationId/read', protect, markMessagesRead);

export default router;
