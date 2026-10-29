import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, logout, switchDemoRole } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

// Staff Registration: STRICTLY PROTECTED (Only authenticated Owner or Manager can register staff)
router.post(
  '/register',
  authenticate,
  authorize('Owner', 'Manager'),
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email address is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['Owner', 'Manager', 'Cashier', 'Barista'])
      .withMessage('Role must be one of: Owner, Manager, Cashier, Barista'),
    validate,
  ],
  register
);

// Staff Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  login
);

// Get Current User Profile
router.get('/me', authenticate, getMe);

// Logout
router.post('/logout', logout);

// Switch Demo Token (Dev only)
router.post('/switch-demo-token', switchDemoRole);

export default router;
