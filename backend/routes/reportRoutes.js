import { Router } from 'express';
import { getReportAnalytics } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';

const router = Router();

router.get('/analytics', authenticate, authorize('Owner', 'Manager'), getReportAnalytics);

export default router;
