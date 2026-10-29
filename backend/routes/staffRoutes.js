import { Router } from 'express';
import { body } from 'express-validator';
import {
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} from '../controllers/staffController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, authorize('Owner', 'Manager'), getStaff);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager'),
  [body('name').trim().notEmpty().withMessage('Staff name is required'), validate],
  createStaff
);

router.put('/:id', authenticate, authorize('Owner', 'Manager'), updateStaff);
router.patch('/:id/status', authenticate, authorize('Owner', 'Manager'), toggleStaffStatus);
router.delete('/:id', authenticate, authorize('Owner'), deleteStaff);

export default router;
