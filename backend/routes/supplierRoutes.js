import { Router } from 'express';
import { body } from 'express-validator';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  recordPayment,
} from '../controllers/supplierController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, authorize('Owner', 'Manager'), getSuppliers);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager'),
  [body('name').trim().notEmpty().withMessage('Supplier name is required'), validate],
  createSupplier
);

router.put('/:id', authenticate, authorize('Owner', 'Manager'), updateSupplier);
router.delete('/:id', authenticate, authorize('Owner'), deleteSupplier);
router.post('/:id/pay', authenticate, authorize('Owner', 'Manager'), recordPayment);

export default router;
