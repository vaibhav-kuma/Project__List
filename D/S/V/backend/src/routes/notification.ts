import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  deleteOldNotifications,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.post('/:notificationId/read', authenticate, markAsRead);
router.post('/mark-all-read', authenticate, markAllAsRead);
router.delete('/:notificationId', authenticate, deleteNotification);
router.delete('/old', authenticate, deleteOldNotifications);

export default router;
