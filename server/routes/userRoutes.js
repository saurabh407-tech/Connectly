
import { Router } from 'express';
import { getUsers } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/users?search=
// Only authenticated users can fetch registered users
router.get('/', protect, getUsers);

export default router;
