import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { fallbackStore } from '../services/storageFallback.js';
import { generateToken } from '../middleware/auth.js';
import { getAuthCookieOptions } from '../config/jwt.js';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf.js';
import mongoose from 'mongoose';

/**
 * Staff Account Registration
 * Protected: Only authenticated Owner or Manager can create staff accounts.
 * Role escalation prevention:
 * - Managers can ONLY create Cashiers or Baristas.
 * - Only Owners can create Owners or Managers.
 */
export const register = async (req, res, next) => {
  try {
    const requester = req.user;
    if (!requester) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Public self-registration is disabled for security.',
      });
    }

    const { name, email, password, role = 'Cashier', phone, shift } = req.body;

    const validRoles = ['Owner', 'Manager', 'Cashier', 'Barista'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Allowed roles: [${validRoles.join(', ')}]`,
      });
    }

    // Role Escalation Protection:
    // Only an Owner can create an Owner or Manager account
    if ((role === 'Owner' || role === 'Manager') && requester.role !== 'Owner') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Only an Owner can create '${role}' accounts. Managers may only create Cashier or Barista accounts.`,
      });
    }

    // MongoDB Mode
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role,
        phone,
        shift: shift || 'Morning (07:00 - 15:00)',
      });

      return res.status(201).json({
        success: true,
        message: `Staff member ${user.name} registered successfully with role '${user.role}'`,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          shift: user.shift,
        },
      });
    }

    // In-Memory Fallback Mode (Development/Test)
    const existing = fallbackStore.users.find((u) => u.email === email.toLowerCase());
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      phone: phone || '',
      shift: shift || 'Morning (07:00 - 15:00)',
      status: 'Active',
    };
    fallbackStore.users.push(newUser);

    return res.status(201).json({
      success: true,
      message: `Staff member ${newUser.name} registered successfully with role '${newUser.role}'`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        shift: newUser.shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Staff Login
 * Verifies email and password using bcrypt.compare (NO universal bypasses).
 * Issues HttpOnly secure cookie and CSRF token.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // MongoDB Mode
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. User not found.',
        });
      }

      if (user.status !== 'Active') {
        return res.status(401).json({
          success: false,
          message: `Account is ${user.status}. Please contact an administrator.`,
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Password incorrect.',
        });
      }

      const token = generateToken({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
      });

      const csrfToken = generateCsrfToken();
      if (typeof res?.cookie === 'function') {
        res.cookie('token', token, getAuthCookieOptions());
      }
      setCsrfCookie(res, csrfToken);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        csrfToken,
        ...(process.env.NODE_ENV === 'production' ? {} : { token }),
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          shift: user.shift,
        },
      });
    }

    // In-memory fallback mode
    const user = fallbackStore.users.find((u) => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    if (user.status !== 'Active') {
      return res.status(401).json({
        success: false,
        message: `Account is ${user.status}. Please contact an administrator.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const csrfToken = generateCsrfToken();
    if (typeof res?.cookie === 'function') {
      res.cookie('token', token, getAuthCookieOptions());
    }
    setCsrfCookie(res, csrfToken);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      csrfToken,
      ...(process.env.NODE_ENV === 'production' ? {} : { token }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        shift: user.shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Authenticated User Profile
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * Logout & Session Revocation
 */
export const logout = async (req, res) => {
  // If user is authenticated in MongoDB, increment tokenVersion to revoke active sessions
  if (req.user && req.user.id && mongoose.connection.readyState === 1) {
    try {
      await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    } catch {
      // Ignore background revocation update error
    }
  }

  // Clear auth and CSRF cookies
  if (typeof res?.clearCookie === 'function') {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('fusion_csrf_token', { path: '/' });
  }

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Switch Demo Role Token (DEV/TEST ONLY)
 */
export const switchDemoRole = async (req, res) => {
  const allowDemoTokens =
    process.env.ALLOW_DEMO_TOKENS === 'true' && process.env.NODE_ENV !== 'production';

  if (!allowDemoTokens) {
    return res.status(403).json({
      success: false,
      message:
        'Demo role switching is disabled in production. Set ALLOW_DEMO_TOKENS=true in non-production environments to enable.',
    });
  }

  const { role = 'Owner' } = req.body;
  const validRoles = ['Owner', 'Manager', 'Cashier', 'Barista'];
  const targetRole = validRoles.includes(role) ? role : 'Owner';

  const fallbackUser = fallbackStore.users.find(
    (u) => u.role.toLowerCase() === targetRole.toLowerCase()
  );

  const payload = {
    id: fallbackUser ? fallbackUser.id : `demo-${targetRole.toLowerCase()}`,
    name: fallbackUser ? fallbackUser.name : `Demo ${targetRole}`,
    email: fallbackUser ? fallbackUser.email : `${targetRole.toLowerCase()}@fusioncoffee.in`,
    role: targetRole,
  };

  const token = generateToken(payload);
  const csrfToken = generateCsrfToken();

  res.cookie('token', token, getAuthCookieOptions());
  setCsrfCookie(res, csrfToken);

  return res.status(200).json({
    success: true,
    message: `Switched active session to ${targetRole}`,
    csrfToken,
    ...(process.env.NODE_ENV === 'production' ? {} : { token }),
    user: payload,
  });
};

export default {
  register,
  login,
  getMe,
  logout,
  switchDemoRole,
};
