import { Router } from 'express';
import { body } from 'express-validator';
import { getAttendance, checkIn, checkOut } from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, getAttendance);

router.post(
  '/check-in',
  authenticate,
  [body('staffId').trim().notEmpty().withMessage('staffId is required'), validate],
  checkIn
);

router.post(
  '/check-out',
  authenticate,
  [body('attendanceId').trim().notEmpty().withMessage('attendanceId is required'), validate],
  checkOut
);

export default router;
