import { Router } from 'express';
import {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  reactivateSubscription,
  updatePlan,
  getPaymentHistory,
  checkFeatureAccess,
} from '../controllers/subscriptionController';
import { handleStripeWebhook } from '../controllers/webhookController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/plans', getPlans);
router.get('/current', authenticate, getCurrentSubscription);
router.post('/checkout', authenticate, createCheckoutSession);
router.post('/billing-portal', authenticate, createBillingPortalSession);
router.post('/cancel', authenticate, cancelSubscription);
router.post('/reactivate', authenticate, reactivateSubscription);
router.post('/update-plan', authenticate, updatePlan);
router.get('/payments', authenticate, getPaymentHistory);
router.get('/feature/:feature', authenticate, checkFeatureAccess);

router.post('/webhook/stripe', handleStripeWebhook);

export default router;
