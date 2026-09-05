import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';
import { stripeService, PLANS } from '../services/stripeService';

const createCheckoutSchema = z.object({
  planId: z.enum(['plus', 'pro']),
  interval: z.enum(['month', 'year']),
  useTrial: z.boolean().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const cancelSubscriptionSchema = z.object({
  reason: z.string().max(200).optional(),
});

const updatePlanSchema = z.object({
  newPlanId: z.enum(['plus', 'pro']),
  interval: z.enum(['month', 'year']),
});

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = Object.values(PLANS).map((plan) => ({
      ...plan,
      monthlyPrice: plan.monthlyPrice / 100,
      yearlyPrice: plan.yearlyPrice / 100,
      yearlySavings: plan.yearlyPrice > 0 ? Math.round(((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100) : 0,
    }));

    res.json({ plans });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        isPremium: true,
        premiumTier: true,
        premiumExpiresAt: true,
      },
    });

    const features = await prisma.subscriptionFeature.findFirst({
      where: { plan: user?.premiumTier || 'free' },
    });

    const trialInfo = subscription?.trialEndsAt
      ? {
          isTrial: true,
          trialEndsAt: subscription.trialEndsAt,
          daysRemaining: Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        }
      : { isTrial: false };

    res.json({
      subscription: subscription
        ? {
            ...subscription,
            amount: Number(subscription.amount),
          }
        : null,
      user: {
        isPremium: user?.isPremium || false,
        premiumTier: user?.premiumTier || 'free',
        premiumExpiresAt: user?.premiumExpiresAt,
      },
      features,
      trial: trialInfo,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const body = createCheckoutSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, displayName: true },
    });

    if (!user?.email) {
      return res.status(400).json({ error: 'User email required' });
    }

    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ['active', 'trialing'] },
      },
    });

    if (existingSub) {
      return res.status(400).json({ error: 'Already have an active subscription' });
    }

    const customer = await stripeService.createCustomer(
      req.userId!,
      user.email,
      user.displayName
    );

    const plan = PLANS[body.planId];
    const useTrial = body.useTrial && plan.trialDays > 0;

    const trialUsed = await prisma.subscription.findFirst({
      where: { userId: req.userId!, trialUsed: true },
    });

    const session = await stripeService.createCheckoutSession({
      userId: req.userId!,
      customerId: customer.id,
      planId: body.planId,
      interval: body.interval,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      trialDays: useTrial && !trialUsed ? plan.trialDays : 0,
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      trialDays: useTrial && !trialUsed ? plan.trialDays : 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBillingPortalSession = async (req: AuthRequest, res: Response) => {
  try {
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'Return URL required' });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ['active', 'trialing', 'past_due', 'cancelled'] },
      },
      select: { providerCustomerId: true },
    });

    if (!subscription?.providerCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripeService.createBillingPortalSession(
      subscription.providerCustomerId,
      returnUrl
    );

    res.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const body = cancelSubscriptionSchema.parse(req.body);

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ['active', 'trialing'] },
      },
      select: { providerSubscriptionId: true, currentPeriodEnd: true },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    await stripeService.cancelSubscription(
      subscription.providerSubscriptionId,
      body.reason
    );

    res.json({
      message: 'Subscription will be cancelled at the end of the billing period',
      accessUntil: subscription.currentPeriodEnd,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reactivateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        cancelAtPeriodEnd: true,
        status: { in: ['active', 'trialing'] },
      },
      select: { providerSubscriptionId: true },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No cancellable subscription found' });
    }

    await stripeService.reactivateSubscription(subscription.providerSubscriptionId);

    res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePlan = async (req: AuthRequest, res: Response) => {
  try {
    const body = updatePlanSchema.parse(req.body);

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ['active', 'trialing'] },
      },
      select: { providerSubscriptionId: true, plan: true, interval: true },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (subscription.plan === body.newPlanId && subscription.interval === body.interval) {
      return res.status(400).json({ error: 'Already subscribed to this plan' });
    }

    await stripeService.updateSubscriptionPlan(
      subscription.providerSubscriptionId,
      body.newPlanId,
      body.interval
    );

    res.json({ message: 'Plan updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const payments = await prisma.paymentHistory.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.paymentHistory.count({
      where: { userId: req.userId! },
    });

    res.json({
      payments: payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
      total,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkFeatureAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { feature } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { premiumTier: true, isPremium: true },
    });

    const plan = user?.premiumTier || 'free';

    const features = await prisma.subscriptionFeature.findUnique({
      where: { plan: plan as any },
    });

    if (!features) {
      return res.json({ hasAccess: false, plan });
    }

    const featureMap: Record<string, keyof typeof features> = {
      'unlimited-extends': 'unlimitedExtends',
      'gender-filter': 'genderFilter',
      'location-filter': 'locationFilter',
      'advanced-filters': 'advancedFilters',
      'priority-matching': 'priorityMatching',
      'rewind': 'rewindFeature',
      'unlimited-rewinds': 'unlimitedRewinds',
      'see-who-liked-you': 'seeWhoLikedYou',
      'see-who-added-as-friend': 'seeWhoAddedAsFriend',
      'ad-free': 'adFree',
      'video-filters': 'videoFilters',
      'exclusive-filters': 'exclusiveFilters',
      'exclusive-stickers': 'exclusiveStickers',
      'hd-video': 'hdVideo',
      'read-receipts': 'readReceipts',
      'incognito-mode': 'incognitoMode',
      'passport': 'passportFeature',
    };

    const featureKey = featureMap[feature];
    const hasAccess = featureKey ? Boolean(features[featureKey]) : false;

    res.json({ hasAccess, plan, feature });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
