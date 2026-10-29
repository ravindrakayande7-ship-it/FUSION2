import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleAvailability,
  deleteProduct,
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, getProducts);
router.get('/:id', authenticate, getProductById);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isNumeric().withMessage('Price must be a valid number'),
    validate,
  ],
  createProduct
);

router.put('/:id', authenticate, authorize('Owner', 'Manager'), updateProduct);
router.patch(
  '/:id/availability',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier', 'Barista'),
  toggleAvailability
);
router.delete('/:id', authenticate, authorize('Owner'), deleteProduct);

export default router;
