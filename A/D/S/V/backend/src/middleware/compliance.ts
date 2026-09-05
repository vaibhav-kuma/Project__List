import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import { parentalConsentService } from '../services/parentalConsentService';
import logger from '../config/logger';

export const requireAgeVerification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { ageVerified: true, age: true, isMinor: true, parentalConsent: true },
    });

    if (!user?.ageVerified) {
      return res.status(403).json({
        error: 'Age verification required',
        requiresAction: 'age_verification',
        redirectUrl: '/compliance/age-verification',
      });
    }

    if (user.isMinor && !user.parentalConsent) {
      return res.status(403).json({
        error: 'Parental consent required for minors',
        requiresAction: 'parental_consent',
        redirectUrl: '/compliance/parental-consent',
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

export const requireLegalConsent = (documentTypes: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          privacyPolicyAccepted: true,
          termsAccepted: true,
          cookieConsent: true,
          dataProcessingConsent: true,
        },
      });

      const consentMap: Record<string, boolean> = {
        privacy_policy: user?.privacyPolicyAccepted || false,
        terms_of_service: user?.termsAccepted || false,
        cookie_policy: user?.cookieConsent || false,
        data_processing_agreement: user?.dataProcessingConsent || false,
      };

      const missingConsents = documentTypes.filter((type) => !consentMap[type]);

      if (missingConsents.length > 0) {
        return res.status(403).json({
          error: 'Legal consent required',
          missingConsents,
          requiresAction: 'legal_consent',
          redirectUrl: '/compliance/legal-documents',
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

export const checkParentalRestrictions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isMinor: true, restrictedMode: true },
    });

    if (!user?.isMinor || !user.restrictedMode) {
      return next();
    }

    const [timeRestriction, matchLimit] = await Promise.all([
      parentalConsentService.checkTimeRestriction(req.userId!),
      parentalConsentService.checkDailyMatchLimit(req.userId!),
    ]);

    if (!timeRestriction.allowed) {
      return res.status(403).json({
        error: 'Access restricted by parental controls',
        reason: timeRestriction.reason,
        requiresAction: 'parental_restriction',
      });
    }

    if (!matchLimit.allowed) {
      return res.status(429).json({
        error: 'Daily match limit reached',
        remaining: matchLimit.remaining,
        limit: matchLimit.limit,
        requiresAction: 'parental_restriction',
      });
    }

    (req as any).parentalRestrictions = {
      timeRestriction,
      matchLimit,
    };

    next();
  } catch (error) {
    logger.error('Parental restriction check error:', error);
    next();
  }
};

export const requireAccountNotDeleted = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { accountDeletionRequested: true, deletedAt: true },
    });

    if (user?.deletedAt && user.deletedAt < new Date()) {
      return res.status(403).json({
        error: 'Account has been deleted',
        requiresAction: 'account_deleted',
      });
    }

    if (user?.accountDeletionRequested) {
      return res.status(403).json({
        error: 'Account deletion in progress',
        gracePeriodEnds: user.deletedAt,
        requiresAction: 'cancel_deletion',
        cancelUrl: '/api/compliance/account-deletion/cancel',
      });
    }

    next();
  } catch (error) {
    logger.error('Account deletion check error:', error);
    next();
  }
};
