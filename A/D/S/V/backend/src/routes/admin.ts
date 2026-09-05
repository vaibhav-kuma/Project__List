import { Router } from 'express';
import {
  getDashboardStats,
  getAnalytics,
  getSystemHealth,
  getUsers,
  getUserDetail,
  banUser,
  unbanUser,
  verifyUserAge,
  getReports,
  resolveReport,
  getModerationQueue,
  getFlaggedContent,
  moderateContent,
  createAnnouncement,
  getErrorLogs,
  getPerformanceMetrics,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireModerator, requireAdminOrModerator } from '../middleware/admin';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard & Analytics (Admin only)
router.get('/dashboard', requireAdmin, getDashboardStats);
router.get('/analytics', requireAdmin, getAnalytics);
router.get('/health', requireAdmin, getSystemHealth);
router.get('/performance', requireAdmin, getPerformanceMetrics);
router.get('/error-logs', requireAdmin, getErrorLogs);

// User Management (Admin only)
router.get('/users', requireAdmin, getUsers);
router.get('/users/:userId', requireAdmin, getUserDetail);
router.post('/users/:userId/ban', requireAdmin, banUser);
router.post('/users/:userId/unban', requireAdmin, unbanUser);
router.post('/users/:userId/verify-age', requireAdmin, verifyUserAge);

// Moderation (Admin or Moderator)
router.get('/reports', requireAdminOrModerator, getReports);
router.post('/reports/:reportId/resolve', requireAdminOrModerator, resolveReport);
router.get('/moderation-queue', requireAdminOrModerator, getModerationQueue);
router.get('/flagged-content', requireAdminOrModerator, getFlaggedContent);
router.post('/moments/:momentId/moderate', requireAdminOrModerator, moderateContent);

// Content Management (Admin only)
router.post('/announcements', requireAdmin, createAnnouncement);

export default router;
