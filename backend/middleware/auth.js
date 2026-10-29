import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { fallbackStore } from '../services/storageFallback.js';
import { getJWTSecret, JWT_EXPIRES_IN } from '../config/jwt.js';
import mongoose from 'mongoose';

export const generateToken = (payload) => {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getJWTSecret());
};

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
    }

    // Support demo role token: "demo-role-<role>" ONLY when explicitly permitted in non-production
    if (token.startsWith('demo-role-')) {
      const allowDemoTokens =
        process.env.ALLOW_DEMO_TOKENS === 'true' && process.env.NODE_ENV !== 'production';

      if (!allowDemoTokens) {
        return res.status(403).json({
          success: false,
          message:
            'Demo tokens and unauthenticated role switching are strictly disabled in production. Please sign in with legitimate staff credentials.',
        });
      }

      const demoRole = token.replace('demo-role-', '');
      const validRoles = ['Owner', 'Manager', 'Cashier', 'Barista'];
      const targetRole = validRoles.includes(demoRole) ? demoRole : 'Owner';

      // Look up fallback user for this demo role
      const fallbackUser = fallbackStore.users.find(
        (u) => u.role.toLowerCase() === targetRole.toLowerCase()
      );

      req.user = {
        id: fallbackUser ? fallbackUser.id : `demo-${targetRole.toLowerCase()}`,
        name: fallbackUser ? fallbackUser.name : `Demo ${targetRole}`,
        email: fallbackUser ? fallbackUser.email : `${targetRole.toLowerCase()}@fusioncoffee.in`,
        role: targetRole,
        shift: fallbackUser ? fallbackUser.shift : 'Morning (07:00 - 15:00)',
      };
      return next();
    }

    // Verify cryptographic JWT signature & expiration
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (jwtErr) {
      const isExpired = jwtErr.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        message: isExpired
          ? 'Session expired. Please log in again.'
          : 'Invalid authentication token. Please log in again.',
      });
    }

    // Security Check: Verify user actually exists in the database / active store
    // NEVER blindly trust arbitrary claims in decoded token if user was deleted or fake
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists or was removed.',
        });
      }

      // Check account status
      if (user.status !== 'Active') {
        return res.status(401).json({
          success: false,
          message: `Your account is currently ${user.status}. Please contact an administrator.`,
        });
      }

      // Check token version if present in payload (revocation check)
      if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({
          success: false,
          message: 'Session has been revoked. Please sign in again.',
        });
      }

      req.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        shift: user.shift,
      };
    } else {
      const fallbackUser = fallbackStore.users.find(
        (u) => u.id === decoded.id || u.email === decoded.email
      );
      if (!fallbackUser) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token does not exist in store.',
        });
      }

      if (fallbackUser.status !== 'Active') {
        return res.status(401).json({
          success: false,
          message: `Your account is currently ${fallbackUser.status}. Please contact an administrator.`,
        });
      }

      req.user = {
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        role: fallbackUser.role,
        shift: fallbackUser.shift,
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

export default {
  generateToken,
  verifyToken,
  authenticate,
};
