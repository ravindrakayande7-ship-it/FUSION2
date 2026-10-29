import { Router } from 'express';
import { body } from 'express-validator';
import {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  recordWastage,
  getLowStockAlerts,
} from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, getInventory);
router.get('/alerts/low-stock', authenticate, getLowStockAlerts);
router.get('/:id', authenticate, getInventoryItem);

router.post(
  '/',
  authenticate,
  authorize('Owner', 'Manager'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('stock').isNumeric().withMessage('Initial stock must be a number'),
    body('unit').trim().notEmpty().withMessage('Unit of measurement is required'),
    body('unitCost').isNumeric().withMessage('Unit cost must be a number'),
    validate,
  ],
  createInventoryItem
);

router.put('/:id', authenticate, authorize('Owner', 'Manager'), updateInventoryItem);
router.post('/:id/adjust', authenticate, authorize('Owner', 'Manager', 'Barista'), adjustStock);
router.post('/:id/wastage', authenticate, authorize('Owner', 'Manager', 'Barista'), recordWastage);

export default router;
