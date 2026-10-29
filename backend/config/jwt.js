import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';


export const validateJWTConfig = () => {
  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
      const msg =
        '[FATAL SECURITY ERROR] In production, JWT_SECRET environment variable must be explicitly defined with at least 32 secure random characters. Unsafe defaults or short secrets are blocked.';
      console.error(msg);
      throw new Error(msg);
    }
    
    const weakSecrets = [
      'secret',
      'password',
      'jwt_secret',
      'fusion_secret',
      'fusion_super_secure_jwt_secret_key_change_in_production_2026',
      'your_super_secret_jwt_key_here',
      'your_secure_random_jwt_secret_change_me_min_16_chars',
      'your_secure_random_jwt_secret_change_me_min_32_chars',
    ];
    if (weakSecrets.includes(process.env.JWT_SECRET.trim().toLowerCase())) {
      const msg =
        '[FATAL SECURITY ERROR] Known or default JWT secret detected in production. Generate a strong unique secret via `openssl rand -hex 32`.';
      console.error(msg);
      throw new Error(msg);
    }
  }
};

export const getJWTSecret = () => {
  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
      throw new Error('JWT_SECRET is not configured for production environment');
    }
    return process.env.JWT_SECRET;
  }
  return process.env.JWT_SECRET || 'fusion_dev_local_secret_key_2026_test_only_min_32_chars';
};

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export const getCsrfCookieOptions = () => ({
  httpOnly: false, 
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

export default {
  validateJWTConfig,
  getJWTSecret,
  JWT_EXPIRES_IN,
  getAuthCookieOptions,
  getCsrfCookieOptions,
};
