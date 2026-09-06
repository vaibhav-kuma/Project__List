import { Router } from 'express';
import {
  createReport,
  getMyReports,
  getModerationQueue,
  updateReport,
  getReportsAgainstUser,
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createReport);
router.get('/my', authenticate, getMyReports);
router.get('/moderation-queue', authenticate, getModerationQueue);
router.put('/:reportId', authenticate, updateReport);
router.get('/user/:userId', getReportsAgainstUser);

export default router;
