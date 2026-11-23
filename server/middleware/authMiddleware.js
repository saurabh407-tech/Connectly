import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verifies the Bearer token and attaches the user to req.user
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401);
      throw new Error('Not authorized, no token');
    }
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    next();
  } catch (error) {
    if (res.statusCode === 200) res.status(401);
    next(error);
  }
};
