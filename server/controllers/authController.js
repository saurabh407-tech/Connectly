
import User from '../models/User.js';
import sendOTP from '../utils/sendOTP.js';
import crypto from 'crypto';
import { uploadImage } from '../services/cloudinaryServices.js';
import jwt from 'jsonwebtoken';
import AuthSession from '../models/AuthSession.js';

const SESSION_LEASE_MS = 30_000;

const createAuthToken = async (userId) => {
  const session = await AuthSession.create({
    user: userId,
    expiresAt: new Date(Date.now() + SESSION_LEASE_MS),
  });
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    jwtid: session._id.toString(),
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const hashOTP = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// @desc Register a new user
// @route POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      isEmailVerified: false,
      emailVerificationOTP: hashOTP(otp),
      emailVerificationOTPExpiry: new Date(Date.now() + 5 * 60 * 1000),
      emailVerificationOTPAttempts: 0,
    });

    try {
      await sendOTP(normalizedEmail, otp, 'registration');
    } catch (emailError) {
      await User.deleteOne({ _id: user._id });
      throw emailError;
    }

    return res.status(201).json({
      success: true,
      message: 'OTP sent successfully. Please verify your email.',
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    next(error);
  }
};

// @desc Verify registration OTP
// @route POST /api/auth/verify-email-otp
export const verifyEmailOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and 6-digit OTP',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select(
      '+emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationOTPAttempts'
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please log in.',
      });
    }

    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please register again.',
      });
    }

    if (user.emailVerificationOTPExpiry.getTime() < Date.now()) {
      user.emailVerificationOTP = null;
      user.emailVerificationOTPExpiry = null;
      user.emailVerificationOTPAttempts = 0;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please register again.',
      });
    }

    if (user.emailVerificationOTPAttempts >= 5) {
      user.emailVerificationOTP = null;
      user.emailVerificationOTPExpiry = null;
      user.emailVerificationOTPAttempts = 0;
      await user.save();

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please register again.',
      });
    }

    const submittedHash = hashOTP(otp);

    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(user.emailVerificationOTP, 'hex')
    );

    if (!isValid) {
      user.emailVerificationOTPAttempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpiry = null;
    user.emailVerificationOTPAttempts = 0;

    await user.save();

    const token = await createAuthToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          about: user.about,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Login user
// @route POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
      });
    }

    const token = await createAuthToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          about: user.about,
          isOnline: user.isOnline,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Renew the short session lease while this browser tab remains active.
export const keepAuthSessionAlive = async (req, res, next) => {
  try {
    if (req.authSessionId) {
      await AuthSession.updateOne(
        { _id: req.authSessionId, user: req.user._id },
        { $set: { expiresAt: new Date(Date.now() + SESSION_LEASE_MS) } }
      );
    }
    return res.status(204).end();
  } catch (error) { next(error); }
};

export const revokeAuthSession = async (req, res, next) => {
  try {
    if (req.authSessionId) await AuthSession.deleteOne({ _id: req.authSessionId, user: req.user._id });
    return res.status(204).end();
  } catch (error) { next(error); }
};

// @desc Get current user
// @route GET /api/auth/me
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'User profile fetched successfully',
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        about: req.user.about,
        isOnline: req.user.isOnline,
        lastSeen: req.user.lastSeen,
      },
    },
  });
};

// @desc Update the signed-in user's profile and password
// @route PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      '+password +pendingEmail +emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationOTPAttempts'
    );
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const about = req.body.about?.trim() ?? '';
    const currentPassword = req.body.currentPassword || '';
    const newPassword = req.body.newPassword || '';
    const emailChanged = email && email !== user.email;

    if (!name || name.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 1 and 60 characters',
      });
    }

    if (about.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'About must be 150 characters or fewer',
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (emailChanged || newPassword) {
      if (!currentPassword || !(await user.matchPassword(currentPassword))) {
        return res.status(400).json({
          success: false,
          message: 'Enter your current password to change email or password',
        });
      }
    }

    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    if (emailChanged) {
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        $or: [{ email }, { pendingEmail: email }],
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered',
        });
      }
    }

    user.name = name;
    user.about = about;

    if (newPassword) user.password = newPassword;

    if (req.file) {
      const uploadedPhoto = await uploadImage(
        req.file.buffer,
        'connectly/profile-photos'
      );
      user.avatar = uploadedPhoto.secure_url;
    }

    if (emailChanged) {
      const emailOTP = crypto.randomInt(100000, 1000000).toString();
      await sendOTP(email, emailOTP, 'registration');
      user.pendingEmail = email;
      user.emailVerificationOTP = hashOTP(emailOTP);
      user.emailVerificationOTPExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.emailVerificationOTPAttempts = 0;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: emailChanged
        ? 'Profile updated. Verify your new email address to finish the change.'
        : 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          about: user.about,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
        emailVerificationRequired: Boolean(emailChanged),
        pendingEmail: emailChanged ? user.pendingEmail : null,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    next(error);
  }
};

// @desc Verify a pending email change
// @route POST /api/auth/profile/verify-email
export const verifyProfileEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: 'Enter the 6-digit verification code',
      });
    }

    const user = await User.findById(req.user._id).select(
      '+pendingEmail +emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationOTPAttempts'
    );

    if (
      !user.pendingEmail ||
      !user.emailVerificationOTP ||
      !user.emailVerificationOTPExpiry
    ) {
      return res.status(400).json({
        success: false,
        message: 'No email change is waiting for verification',
      });
    }

    if (user.emailVerificationOTPExpiry.getTime() < Date.now()) {
      user.pendingEmail = null;
      user.emailVerificationOTP = null;
      user.emailVerificationOTPExpiry = null;
      user.emailVerificationOTPAttempts = 0;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Save your profile again to request a new one.',
      });
    }

    if (user.emailVerificationOTPAttempts >= 5) {
      user.pendingEmail = null;
      user.emailVerificationOTP = null;
      user.emailVerificationOTPExpiry = null;
      user.emailVerificationOTPAttempts = 0;
      await user.save();

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Save your profile again to request a new code.',
      });
    }

    const submittedHash = hashOTP(otp);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(user.emailVerificationOTP, 'hex')
    );

    if (!isValid) {
      user.emailVerificationOTPAttempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code',
      });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpiry = null;
    user.emailVerificationOTPAttempts = 0;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email address updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          about: user.about,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Change the signed-in user's password
// @route POST /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current password and a new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    if (await user.matchPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Send password reset OTP
// @route POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists, an OTP will be sent to the email.',
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.resetPasswordOTP = hashOTP(otp);
    user.resetPasswordOTPExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.resetPasswordOTPAttempts = 0;

    await user.save();

    try {
      await sendOTP(user.email, otp, 'password-reset');
    } catch (emailError) {
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpiry = null;
      user.resetPasswordOTPAttempts = 0;
      await user.save();

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists, an OTP will be sent to the email.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Verify password reset OTP
// @route POST /api/auth/verify-reset-otp
export const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and 6-digit OTP',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select(
      '+resetPasswordOTP +resetPasswordOTPExpiry +resetPasswordOTPAttempts'
    );

    if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    if (user.resetPasswordOTPExpiry.getTime() < Date.now()) {
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpiry = null;
      user.resetPasswordOTPAttempts = 0;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new OTP.',
      });
    }

    if (user.resetPasswordOTPAttempts >= 5) {
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpiry = null;
      user.resetPasswordOTPAttempts = 0;
      await user.save();

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Request a new OTP.',
      });
    }

    const submittedHash = hashOTP(otp);

    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(user.resetPasswordOTP, 'hex')
    );

    if (!isValid) {
      user.resetPasswordOTPAttempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordOTP = hashOTP(resetToken);
    user.resetPasswordOTPExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.resetPasswordOTPAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Reset password
// @route POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, reset token and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+resetPasswordOTP +resetPasswordOTPExpiry');

    if (
      !user ||
      !user.resetPasswordOTP ||
      !user.resetPasswordOTPExpiry ||
      user.resetPasswordOTPExpiry.getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset session',
      });
    }

    const submittedHash = hashOTP(resetToken);

    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(user.resetPasswordOTP, 'hex')
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password reset session',
      });
    }

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpiry = null;
    user.resetPasswordOTPAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in.',
    });
  } catch (error) {
    next(error);
  }
};
