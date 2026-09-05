import { Request, Response } from 'express';
import logger from '../config/logger';
import { stripeService } from '../services/stripeService';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const payload = req.body;
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'No signature provided' });
  }

  try {
    const event = await stripeService.handleWebhookEvent(payload, signature);

    logger.info(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as any;
        if (session.mode === 'subscription') {
          await stripeService.handleSubscriptionCreated({
            ...event,
            data: { object: { ...session, id: session.subscription } },
          } as any);
        }
        break;

      case 'customer.subscription.created':
        await stripeService.handleSubscriptionCreated(event);
        break;

      case 'customer.subscription.updated':
        await stripeService.handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await stripeService.handleSubscriptionDeleted(event);
        break;

      case 'invoice.payment_succeeded':
        await stripeService.handleInvoicePaymentSucceeded(event);
        break;

      case 'invoice.payment_failed':
        await stripeService.handleInvoicePaymentFailed(event);
        break;

      case 'charge.refunded':
        logger.info(`Charge refunded: ${event.data.object}`);
        break;

      case 'charge.dispute.created':
        logger.warn(`Dispute created: ${event.data.object}`);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    return res.status(400).json({ error: error.message });
  }
};
