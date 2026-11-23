
import { Router } from 'express';

import {
  register,
  login,
  getMe,
  verifyEmailOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  updateProfile,
  verifyProfileEmail,
  changePassword,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';
import profilePhotoUpload from '../middleware/profilePhotoUploadMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, profilePhotoUpload.single('avatar'), updateProfile);
router.post('/profile/verify-email', protect, verifyProfileEmail);
router.post('/change-password', protect, changePassword);

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

export default router;
