import { Router } from 'express';
import { getMomentUploadUrl, updateAvatar } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/moment', authenticate, getMomentUploadUrl);
router.post('/avatar', authenticate, updateAvatar);

export default router;
