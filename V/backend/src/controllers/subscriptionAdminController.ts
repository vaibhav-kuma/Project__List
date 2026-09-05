import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { SubscriptionAnalyticsService } from '../services/subscriptionAnalytics';
import logger from '../config/logger';

export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
  try {
    const overview = await SubscriptionAnalyticsService.getOverview();
    res.json({ overview });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRevenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    const report = await SubscriptionAnalyticsService.getRevenueReport(period as any);
    res.json({ report });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserLifetimeValue = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const ltv = await SubscriptionAnalyticsService.getUserLifetimeValue(userId);
    res.json({ ltv });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChurnPrediction = async (req: AuthRequest, res: Response) => {
  try {
    const prediction = await SubscriptionAnalyticsService.getChurnPrediction();
    res.json({ prediction });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDailyActiveSubscribers = async (req: AuthRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const data = await SubscriptionAnalyticsService.getDailyActiveSubscribers(Number(days));
    res.json({ data });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const grantFreeTrial = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, days = 7 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isPremium: true, email: true, displayName: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumTier: 'plus',
          premiumExpiresAt: trialEndsAt,
        },
      });

      await tx.subscription.create({
        data: {
          userId,
          plan: 'plus',
          status: 'trialing',
          provider: 'manual',
          providerSubscriptionId: `manual_trial_${Date.now()}`,
          amount: 0,
          currency: 'usd',
          interval: 'month',
          trialEndsAt,
          trialUsed: true,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
          autoRenew: false,
          metadata: { grantedBy: req.userId, reason: 'admin_grant' },
        },
      });
    });

    logger.info(`Free trial granted to ${userId} by admin ${req.userId}`);

    res.json({
      message: `Free trial granted for ${days} days`,
      trialEndsAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
