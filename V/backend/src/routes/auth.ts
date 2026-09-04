import { Router } from 'express';
import {
  register,
  login,
  socialLogin,
  verifyEmail,
  verifyPhone,
  resendVerification,
  getProfile,
  updateProfile,
  updatePrivacySettings,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  deleteAccount,
  refreshToken,
  submitParentalConsent,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social', socialLogin);
router.post('/refresh-token', refreshToken);

router.post('/verify-email', verifyEmail);
router.post('/verify-phone', verifyPhone);
router.post('/resend-verification', authenticate, resendVerification);

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/privacy', authenticate, updatePrivacySettings);

router.post('/change-password', authenticate, changePassword);

router.post('/2fa/setup', authenticate, setupTwoFactor);
router.post('/2fa/enable', authenticate, enableTwoFactor);
router.post('/2fa/disable', authenticate, disableTwoFactor);

router.post('/delete-account', authenticate, deleteAccount);

router.post('/parental-consent/:childUserId', submitParentalConsent);

export default router;
