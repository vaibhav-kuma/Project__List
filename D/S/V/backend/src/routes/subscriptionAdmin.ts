import { Router } from 'express';
import {
  getAnalyticsOverview,
  getRevenueReport,
  getUserLifetimeValue,
  getChurnPrediction,
  getDailyActiveSubscribers,
  grantFreeTrial,
} from '../controllers/subscriptionAdminController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

router.get('/analytics', authenticate, requireRole(['admin']), getAnalyticsOverview);
router.get('/analytics/revenue', authenticate, requireRole(['admin']), getRevenueReport);
router.get('/analytics/churn', authenticate, requireRole(['admin']), getChurnPrediction);
router.get('/analytics/daily', authenticate, requireRole(['admin']), getDailyActiveSubscribers);
router.get('/analytics/user/:userId/ltv', authenticate, requireRole(['admin']), getUserLifetimeValue);
router.post('/grant-trial', authenticate, requireRole(['admin']), grantFreeTrial);

export default router;
