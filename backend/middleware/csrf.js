import crypto from 'crypto';
import { getCsrfCookieOptions } from '../config/jwt.js';

export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const setCsrfCookie = (res, token) => {
  if (typeof res?.cookie === 'function') {
    res.cookie('fusion_csrf_token', token, getCsrfCookieOptions());
  }
};

/**
 * CSRF Protection Middleware
 * Protects state-changing requests (POST, PUT, PATCH, DELETE) when cookie authentication is used.
 */
export const verifyCsrf = (req, res, next) => {
  // Safe read-only HTTP methods do not require CSRF token
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt public endpoints like login and health
  const exemptPaths = ['/api/auth/login', '/api/health'];
  if (exemptPaths.some((p) => req.path === p || req.originalUrl?.startsWith(p))) {
    return next();
  }

  // If request is authenticated strictly via Authorization Bearer header, browser CSRF is mitigated
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // If authenticated via cookie, check CSRF token
  if (req.cookies && req.cookies.token) {
    const clientCsrfToken =
      req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || req.body?._csrf;
    const cookieCsrfToken = req.cookies['fusion_csrf_token'];

    if (!clientCsrfToken || !cookieCsrfToken || clientCsrfToken !== cookieCsrfToken) {
      return res.status(403).json({
        success: false,
        message: 'CSRF verification failed. Missing or mismatched CSRF protection token.',
      });
    }
  }

  next();
};

export default {
  generateCsrfToken,
  setCsrfCookie,
  verifyCsrf,
};
