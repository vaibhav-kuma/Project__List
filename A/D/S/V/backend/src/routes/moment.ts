import { Router } from 'express';
import {
  createMoment,
  getMomentsFeed,
  getUserMoments,
  getMomentById,
  viewMoment,
  likeMoment,
  replyToMoment,
  getMomentViews,
  updateMoment,
  deleteMoment,
  getDiscoverMoments,
} from '../controllers/momentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createMoment);
router.get('/feed', authenticate, getMomentsFeed);
router.get('/discover', authenticate, getDiscoverMoments);
router.get('/user/:userId', getUserMoments);
router.get('/:momentId', getMomentById);

router.post('/:momentId/view', authenticate, viewMoment);
router.post('/:momentId/like', authenticate, likeMoment);
router.post('/:momentId/reply', authenticate, replyToMoment);
router.get('/:momentId/views', authenticate, getMomentViews);

router.put('/:momentId', authenticate, updateMoment);
router.delete('/:momentId', authenticate, deleteMoment);

export default router;
