import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';

export const requirePremium = (plan?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { isPremium: true, premiumTier: true, premiumExpiresAt: true },
      });

      if (!user?.isPremium) {
        return res.status(403).json({
          error: 'Premium subscription required',
          requiresUpgrade: true,
          feature: 'premium',
        });
      }

      if (user.premiumExpiresAt && user.premiumExpiresAt < new Date()) {
        await prisma.user.update({
          where: { id: req.userId },
          data: { isPremium: false, premiumTier: 'free' },
        });

        return res.status(403).json({
          error: 'Subscription expired',
          requiresUpgrade: true,
          feature: 'premium',
        });
      }

      if (plan && user.premiumTier !== plan && user.premiumTier !== 'premium') {
        return res.status(403).json({
          error: `${plan} subscription required`,
          requiresUpgrade: true,
          feature: plan,
          currentPlan: user.premiumTier,
        });
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const requireFeature = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { premiumTier: true, isPremium: true },
      });

      const plan = user?.premiumTier || 'free';

      const features = await prisma.subscriptionFeature.findUnique({
        where: { plan: plan as any },
      });

      if (!features) {
        return res.status(403).json({
          error: 'Feature not available',
          requiresUpgrade: true,
          feature,
        });
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

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature requires premium subscription',
          requiresUpgrade: true,
          feature,
          currentPlan: plan,
        });
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const getSubscriptionStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isPremium: true, premiumTier: true, premiumExpiresAt: true },
    });

    (req as any).subscriptionStatus = {
      isPremium: user?.isPremium || false,
      premiumTier: user?.premiumTier || 'free',
      premiumExpiresAt: user?.premiumExpiresAt,
    };

    next();
  } catch {
    next();
  }
};
