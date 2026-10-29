import { Router } from 'express';
import { body } from 'express-validator';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, authorize('Owner', 'Manager'), getExpenses);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager'),
  [
    body('title').trim().notEmpty().withMessage('Expense title is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    validate,
  ],
  createExpense
);

router.delete('/:id', authenticate, authorize('Owner', 'Manager'), deleteExpense);

export default router;
