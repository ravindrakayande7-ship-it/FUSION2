import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, getCustomers);
router.get('/:id', authenticate, getCustomerById);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier'),
  [body('name').trim().notEmpty().withMessage('Customer name is required'), validate],
  createCustomer
);

router.put('/:id', authenticate, authorize('Owner', 'Manager', 'Cashier'), updateCustomer);
router.delete('/:id', authenticate, authorize('Owner'), deleteCustomer);

export default router;
