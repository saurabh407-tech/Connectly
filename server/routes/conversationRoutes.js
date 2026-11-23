

import { Router } from 'express';

import {
  createConversation,
  getConversations,
} from '../controllers/conversationController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, getConversations);
router.post('/:receiverId', protect, createConversation);

export default router;
