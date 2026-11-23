
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    pendingEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      select: false,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    avatar: {
      type: String,
      default: '',
    },

    about: {
      type: String,
      default: 'Hey there! I am using Connectly.',
    },

    // Registration Email Verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOTP: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationOTPExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerificationOTPAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // Forgot Password OTP
    resetPasswordOTP: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordOTPExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    resetPasswordOTPAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
