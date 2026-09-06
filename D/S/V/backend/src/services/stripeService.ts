import Stripe from 'stripe';
import prisma from '../config/database';
import logger from '../config/logger';

export interface SubscriptionPlanConfig {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  trialDays: number;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<string, SubscriptionPlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic features to get started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: '',
    yearlyPriceId: '',
    trialDays: 0,
    features: [
      '10 daily matches',
      '15-second video chats',
      'Basic filters',
      'Standard video quality',
    ],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    description: 'Unlock premium features and unlimited matches',
    monthlyPrice: 999,
    yearlyPrice: 9999,
    monthlyPriceId: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID || '',
    yearlyPriceId: process.env.STRIPE_PLUS_YEARLY_PRICE_ID || '',
    trialDays: 7,
    features: [
      'Unlimited matches',
      'Unlimited video chats',
      'Advanced filters (location, interests)',
      'Unlimited rewinds',
      'Ad-free experience',
      'Priority matching',
      'Exclusive filters & stickers',
      'See who added you as friend',
      'HD video quality',
      'Read receipts',
    ],
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Maximum visibility and exclusive features',
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
    trialDays: 7,
    features: [
      'Everything in Plus',
      'Incognito mode',
      'Passport feature',
      '5 profile boosts per month',
      'Priority customer support',
      'Early access to new features',
    ],
  },
};

class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20',
    });
  }

  async createCustomer(userId: string, email: string, displayName: string): Promise<Stripe.Customer> {
    const existingCustomer = await prisma.subscription.findFirst({
      where: { userId, provider: 'stripe' },
      select: { providerCustomerId: true },
    });

    if (existingCustomer?.providerCustomerId) {
      return await this.stripe.customers.retrieve(existingCustomer.providerCustomerId) as Stripe.Customer;
    }

    const customer = await this.stripe.customers.create({
      email,
      name: displayName,
      metadata: { userId },
    });

    return customer;
  }

  async createCheckoutSession(params: {
    userId: string;
    customerId: string;
    planId: string;
    interval: 'month' | 'year';
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
  }): Promise<Stripe.Checkout.Session> {
    const plan = PLANS[params.planId];
    if (!plan) throw new Error('Invalid plan');

    const priceId = params.interval === 'year' ? plan.yearlyPriceId : plan.monthlyPriceId;
    if (!priceId) throw new Error('Price ID not configured for this plan');

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        metadata: {
          userId: params.userId,
          planId: params.planId,
          interval: params.interval,
        },
      },
      metadata: {
        userId: params.userId,
        planId: params.planId,
        interval: params.interval,
      },
    };

    if (params.trialDays && params.trialDays > 0) {
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        trial_period_days: params.trialDays,
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return session;
  }

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<any> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }

  async handleWebhookEvent(payload: string, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      logger.error('Stripe webhook verification failed:', error);
      throw error;
    }
  }

  async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (!userId) {
      logger.error('No userId in subscription metadata');
      return;
    }

    const planId = subscription.metadata?.planId || 'plus';
    const interval = subscription.metadata?.interval || 'month';

    const plan = PLANS[planId];
    const amount = interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.create({
        data: {
          userId,
          plan: planId as any,
          status: subscription.status as any,
          provider: 'stripe',
          providerSubscriptionId: subscription.id,
          providerCustomerId: subscription.customer as string,
          amount: amount / 100,
          currency: subscription.currency || 'usd',
          interval,
          trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          trialUsed: subscription.trial_end ? true : false,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          autoRenew: !subscription.cancel_at_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumTier: planId as any,
          premiumExpiresAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : new Date(subscription.current_period_end * 1000),
        },
      });

      await tx.paymentHistory.create({
        data: {
          userId,
          subscriptionId: '',
          amount: amount / 100,
          currency: subscription.currency || 'usd',
          status: 'succeeded',
          provider: 'stripe',
          providerPaymentId: (subscription as any).latest_payment as string,
        },
      });
    });

    logger.info(`Subscription created for user ${userId}: ${planId} (${interval})`);
  }

  async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscription.id },
      data: {
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        autoRenew: !subscription.cancel_at_period_end,
      },
    });

    if (subscription.cancel_at_period_end) {
      const sub = await prisma.subscription.findFirst({
        where: { providerSubscriptionId: subscription.id },
        select: { userId: true, currentPeriodEnd: true },
      });

      if (sub) {
        await prisma.user.update({
          where: { id: sub.userId },
          data: {
            premiumExpiresAt: sub.currentPeriodEnd,
          },
        });
      }
    }

    logger.info(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
  }

  async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscription.id },
      select: { userId: true },
    });

    if (sub) {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: { providerSubscriptionId: subscription.id },
          data: {
            status: 'expired',
            autoRenew: false,
          },
        });

        await tx.user.update({
          where: { id: sub.userId },
          data: {
            isPremium: false,
            premiumTier: 'free',
            premiumExpiresAt: null,
          },
        });
      });

      logger.info(`Subscription expired for user ${sub.userId}`);
    }
  }

  async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;

    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
      select: { id: true, userId: true },
    });

    if (sub) {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'active',
            lastBillingDate: new Date(),
            failedPaymentCount: 0,
          },
        });

        await tx.paymentHistory.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'usd',
            status: 'succeeded',
            provider: 'stripe',
            providerPaymentId: invoice.payment_intent as string,
            providerInvoiceId: invoice.id,
          },
        });
      });

      logger.info(`Payment succeeded for subscription ${subscriptionId}`);
    }
  }

  async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;

    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
      select: { id: true, userId: true, failedPaymentCount: true },
    });

    if (sub) {
      const newCount = sub.failedPaymentCount + 1;

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: newCount >= 3 ? 'past_due' : 'active',
          failedPaymentCount: newCount,
        },
      });

      if (newCount >= 3) {
        await prisma.user.update({
          where: { id: sub.userId },
          data: {
            isPremium: false,
            premiumTier: 'free',
          },
        });
      }

      logger.warn(`Payment failed for subscription ${subscriptionId}, attempt ${newCount}`);
    }
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
      select: { id: true, providerSubscriptionId: true, userId: true },
    });

    if (!sub) throw new Error('Subscription not found');

    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: reason,
        feedback: reason ? 'other' : null,
      },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        cancellationReason: reason,
        autoRenew: false,
      },
    });

    logger.info(`Subscription cancelled: ${subscriptionId}`);
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancellationReason: null,
        autoRenew: true,
      },
    });

    logger.info(`Subscription reactivated: ${subscriptionId}`);
  }

  async updateSubscriptionPlan(subscriptionId: string, newPlanId: string, interval: 'month' | 'year'): Promise<void> {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
      select: { providerSubscriptionId: true },
    });

    if (!sub) throw new Error('Subscription not found');

    const plan = PLANS[newPlanId];
    const priceId = interval === 'year' ? plan.yearlyPriceId : plan.monthlyPriceId;

    const stripeSub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const currentItemId = stripeSub.items.data[0].id;

    await this.stripe.subscriptionItems.update(currentItemId, {
      price: priceId,
      proration_behavior: 'create_prorations',
    });

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: {
        plan: newPlanId as any,
        interval,
      },
    });

    logger.info(`Subscription plan updated: ${subscriptionId} -> ${newPlanId}`);
  }

  getStripeInstance(): Stripe {
    return this.stripe;
  }
}

export const stripeService = new StripeService();
