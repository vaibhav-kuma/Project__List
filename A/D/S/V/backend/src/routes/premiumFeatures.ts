import { Router } from 'express';
import {
  getRecentMatches,
  rewindMatch,
  getWhoAddedAsFriend,
  getDailyMatchStats,
} from '../controllers/premiumFeaturesController';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/subscription';

const router = Router();

router.get('/recent-matches', authenticate, getRecentMatches);
router.post('/rewind', authenticate, requireFeature('rewind'), rewindMatch);
router.get('/who-added-friend', authenticate, requireFeature('see-who-added-as-friend'), getWhoAddedAsFriend);
router.get('/daily-stats', authenticate, getDailyMatchStats);

export default router;
