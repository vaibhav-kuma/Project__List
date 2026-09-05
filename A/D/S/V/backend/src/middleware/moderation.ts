import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';

export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many reports submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as AuthRequest).userId || req.ip || 'unknown';
  },
});

export const appealRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many appeals submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as AuthRequest).userId || req.ip || 'unknown';
  },
});

export const moderationActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many moderation actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as AuthRequest).userId || req.ip || 'unknown';
  },
});

export const checkUserBanStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        isBanned: true,
        banReason: true,
        banExpiresAt: true,
        isShadowBanned: true,
        severityScore: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      if (user.banExpiresAt && user.banExpiresAt < new Date()) {
        await prisma.user.update({
          where: { id: req.userId },
          data: { isBanned: false, banReason: null, banExpiresAt: null },
        });
      } else {
        return res.status(403).json({
          error: 'Account suspended',
          banReason: user.banReason,
          banExpiresAt: user.banExpiresAt,
        });
      }
    }

    (req as any).userStatus = {
      isShadowBanned: user.isShadowBanned,
      severityScore: user.severityScore,
    };

    next();
  } catch (error) {
    logger.error('Ban status check error:', error);
    next();
  }
};

export const preventShadowBannedActions = (actions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userStatus = (req as any).userStatus;

    if (userStatus?.isShadowBanned && actions.includes(req.path)) {
      return res.status(403).json({
        error: 'Action restricted due to account limitations',
      });
    }

    next();
  };
};
