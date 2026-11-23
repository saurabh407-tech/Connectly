
import User from '../models/User.js';

// @desc Get all registered users
// @route GET /api/users
// @access Private
export const getUsers = async (req, res, next) => {
  try {
    const search = req.query.search?.trim() || '';

    const users = await User.find({
      _id: { $ne: req.user._id },
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }),
    })
      .select('name email avatar about isOnline lastSeen')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};
