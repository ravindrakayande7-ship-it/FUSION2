import { Router } from 'express';
import { body } from 'express-validator';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getRazorpayConfigHandler,
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

// Razorpay Online Gateway Endpoints (Mounted before /:id)
router.get('/razorpay/config', authenticate, getRazorpayConfigHandler);
router.post(
  '/razorpay/order',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier', 'Barista'),
  [
    body('items').isArray({ min: 1 }).withMessage('Cart items are required'),
    body('paymentMethod').isIn(['UPI', 'Card']).withMessage('Razorpay supports UPI or Card checkout only'),
    validate,
  ],
  createRazorpayOrderHandler
);
router.post(
  '/razorpay/verify',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier', 'Barista'),
  verifyRazorpayPaymentHandler
);

router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrderById);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier', 'Barista'),
  [
    body('items').isArray({ min: 1 }).withMessage('Items array cannot be empty'),
    body('paymentMethod').optional().isIn(['UPI', 'Cash', 'Card', 'Other']),
    validate,
  ],
  createOrder
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier', 'Barista'),
  [
    body('status').trim().notEmpty().withMessage('Target status is required'),
    validate,
  ],
  updateOrderStatus
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('Owner', 'Manager', 'Cashier'),
  cancelOrder
);

export default router;
