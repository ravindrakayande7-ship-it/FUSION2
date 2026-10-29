import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  resetDemoData,
  getFullBackup,
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';

const router = Router();

router.get('/', authenticate, getSettings);
router.put('/', authenticate, authorize('Owner'), updateSettings);
router.post('/reset-demo', authenticate, authorize('Owner'), resetDemoData);
router.get('/backup', authenticate, authorize('Owner'), getFullBackup);

export default router;
