import { Router } from 'express';
import {
  createReport,
  submitAppeal,
  getMyReports,
  getMyAppeals,
  getModerationQueue,
  updateReport,
  reviewAppeal,
  getReportsAgainstUser,
  getPendingAppeals,
} from '../controllers/reportController';
import {
  getDashboardOverview,
  getUserDetails,
  banUser,
  warnUser,
  clearUser,
  getBannedUsers,
  getModerationLogs,
  updateMLThresholds,
  getMLStats,
} from '../controllers/moderationDashboardController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { reportRateLimiter, appealRateLimiter, moderationActionLimiter, checkUserBanStatus } from '../middleware/moderation';

const router = Router();

router.post('/report', authenticate, checkUserBanStatus, reportRateLimiter, createReport);
router.get('/my-reports', authenticate, getMyReports);
router.get('/my-appeals', authenticate, getMyAppeals);
router.post('/appeal', authenticate, appealRateLimiter, submitAppeal);

router.get('/queue', authenticate, requireRole(['moderator', 'admin']), getModerationQueue);
router.put('/report/:reportId', authenticate, requireRole(['moderator', 'admin']), moderationActionLimiter, updateReport);
router.get('/user/:userId/reports', authenticate, requireRole(['moderator', 'admin']), getReportsAgainstUser);
router.get('/appeals/pending', authenticate, requireRole(['moderator', 'admin']), getPendingAppeals);
router.post('/appeal/:appealId/review', authenticate, requireRole(['moderator', 'admin']), moderationActionLimiter, reviewAppeal);

router.get('/dashboard', authenticate, requireRole(['moderator', 'admin']), getDashboardOverview);
router.get('/user/:userId', authenticate, requireRole(['moderator', 'admin']), getUserDetails);
router.post('/ban', authenticate, requireRole(['moderator', 'admin']), moderationActionLimiter, banUser);
router.post('/warn', authenticate, requireRole(['moderator', 'admin']), moderationActionLimiter, warnUser);
router.post('/clear', authenticate, requireRole(['moderator', 'admin']), moderationActionLimiter, clearUser);
router.get('/banned', authenticate, requireRole(['moderator', 'admin']), getBannedUsers);
router.get('/logs', authenticate, requireRole(['moderator', 'admin']), getModerationLogs);

router.put('/ml/thresholds', authenticate, requireRole(['admin']), updateMLThresholds);
router.get('/ml/stats', authenticate, requireRole(['moderator', 'admin']), getMLStats);

export default router;
