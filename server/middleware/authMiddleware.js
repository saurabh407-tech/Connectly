import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';

// Verifies the Bearer token and attaches the user to req.user
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401);
      throw new Error('Not authorized, no token');
    }
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const [user, session] = await Promise.all([
      User.findById(decoded.id).select('-password'),
      decoded.jti
        ? AuthSession.findOne({
        _id: decoded.jti,
        user: decoded.id,
        expiresAt: { $gt: new Date() },
      }).select('_id')
        : Promise.resolve(null),
    ]);
    if (decoded.jti) {
      if (!session) {
        res.status(401);
        throw new Error('Session expired. Please log in again.');
      }
      req.authSessionId = session._id;
    }
    req.user = user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    next();
  } catch (error) {
    if (res.statusCode === 200) res.status(401);
    next(error);
  }
};
