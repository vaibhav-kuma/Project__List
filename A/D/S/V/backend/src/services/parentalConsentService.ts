import prisma from '../config/database';
import logger from '../config/logger';
import { emailService } from './emailService';
import { v4 as uuidv4 } from 'uuid';

export interface ParentalConsentRequest {
  userId: string;
  parentEmail: string;
  parentName: string;
  restrictions?: {
    maxDailyMatches?: number;
    noVideoChat?: boolean;
    noMessaging?: boolean;
    requireApproval?: boolean;
    timeRestrictions?: {
      startHour?: number;
      endHour?: number;
    };
  };
}

export interface ParentalConsentResponse {
  consentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  message: string;
}

class ParentalConsentService {
  private readonly CONSENT_EXPIRY_DAYS = 365;
  private readonly CONSENT_TOKEN_EXPIRY_HOURS = 168;

  async requestConsent(request: ParentalConsentRequest): Promise<ParentalConsentResponse> {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, displayName: true, age: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.age >= 18) {
      throw new Error('Parental consent not required for adults');
    }

    const existingConsent = await prisma.parentalConsent.findFirst({
      where: {
        userId: request.userId,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existingConsent?.status === 'approved') {
      return {
        consentId: existingConsent.id,
        status: 'approved',
        message: 'Parental consent already granted',
      };
    }

    if (existingConsent?.status === 'pending') {
      return {
        consentId: existingConsent.id,
        status: 'pending',
        message: 'Parental consent request already pending',
      };
    }

    const consentToken = uuidv4();
    const consentFormUrl = `${process.env.FRONTEND_URL}/parental-consent/${consentToken}`;

    const consent = await prisma.parentalConsent.create({
      data: {
        userId: request.userId,
        parentEmail: request.parentEmail,
        parentName: request.parentName,
        consentToken,
        status: 'pending',
        consentExpiresAt: new Date(Date.now() + this.CONSENT_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
        restrictions: request.restrictions || {
          maxDailyMatches: 5,
          noVideoChat: false,
          noMessaging: false,
          requireApproval: true,
          timeRestrictions: {
            startHour: 8,
            endHour: 20,
          },
        },
      },
    });

    await emailService.sendParentalConsentEmail(
      request.parentEmail,
      request.parentName,
      user.displayName,
      consentToken,
      consentFormUrl
    );

    logger.info(`Parental consent requested for user ${user.displayName} by ${request.parentEmail}`);

    return {
      consentId: consent.id,
      status: 'pending',
      message: 'Consent request sent to parent email',
    };
  }

  async getConsentByToken(token: string): Promise<any> {
    const consent = await prisma.parentalConsent.findUnique({
      where: { consentToken: token },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            age: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!consent) {
      throw new Error('Invalid consent token');
    }

    if (consent.status === 'expired' || (consent.consentExpiresAt && consent.consentExpiresAt < new Date())) {
      return {
        ...consent,
        status: 'expired',
        message: 'Consent request has expired',
      };
    }

    return consent;
  }

  async approveConsent(token: string, parentSignature?: string): Promise<ParentalConsentResponse> {
    const consent = await prisma.parentalConsent.findUnique({
      where: { consentToken: token },
      select: { id: true, userId: true, status: true, consentExpiresAt: true, restrictions: true },
    });

    if (!consent) {
      throw new Error('Invalid consent token');
    }

    if (consent.status !== 'pending') {
      return {
        consentId: consent.id,
        status: consent.status as any,
        message: `Consent already ${consent.status}`,
      };
    }

    if (consent.consentExpiresAt && consent.consentExpiresAt < new Date()) {
      await prisma.parentalConsent.update({
        where: { id: consent.id },
        data: { status: 'expired' },
      });

      return {
        consentId: consent.id,
        status: 'expired',
        message: 'Consent request has expired',
      };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.parentalConsent.update({
        where: { id: consent.id },
        data: {
          status: 'approved',
          consentGivenAt: now,
          consentFormSigned: !!parentSignature,
          consentExpiresAt: expiresAt,
        },
      });

      await tx.user.update({
        where: { id: consent.userId },
        data: {
          parentalConsent: true,
          parentalConsentDate: now,
          isMinor: true,
          restrictedMode: true,
        },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: consent.userId },
      select: { email: true, displayName: true },
    });

    if (user?.email) {
      await emailService.sendConsentApprovedEmail(user.email, user.displayName);
    }

    logger.info(`Parental consent approved for user ${consent.userId}`);

    return {
      consentId: consent.id,
      status: 'approved',
      message: 'Parental consent granted successfully',
    };
  }

  async revokeConsent(userId: string, revokedBy: 'parent' | 'user' | 'admin'): Promise<ParentalConsentResponse> {
    const consent = await prisma.parentalConsent.findFirst({
      where: { userId, status: 'approved' },
      orderBy: { consentGivenAt: 'desc' },
    });

    if (!consent) {
      throw new Error('No active consent found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.parentalConsent.update({
        where: { id: consent.id },
        data: {
          status: 'revoked',
          consentRevokedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          parentalConsent: false,
          restrictedMode: true,
        },
      });
    });

    logger.info(`Parental consent revoked for user ${userId} by ${revokedBy}`);

    return {
      consentId: consent.id,
      status: 'revoked',
      message: 'Parental consent has been revoked',
    };
  }

  async getConsentHistory(userId: string): Promise<any[]> {
    const consents = await prisma.parentalConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return consents.map((c) => ({
      id: c.id,
      parentEmail: c.parentEmail,
      parentName: c.parentName,
      status: c.status,
      consentGivenAt: c.consentGivenAt,
      consentRevokedAt: c.consentRevokedAt,
      consentExpiresAt: c.consentExpiresAt,
      restrictions: c.restrictions,
      createdAt: c.createdAt,
    }));
  }

  async checkTimeRestriction(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const consent = await prisma.parentalConsent.findFirst({
      where: { userId, status: 'approved' },
      select: { restrictions: true },
    });

    const restrictions = consent?.restrictions as any;
    if (!restrictions?.timeRestrictions) {
      return { allowed: true };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const { startHour, endHour } = restrictions.timeRestrictions;

    if (currentHour < startHour || currentHour >= endHour) {
      return {
        allowed: false,
        reason: `Access restricted between ${startHour}:00 and ${endHour}:00`,
      };
    }

    return { allowed: true };
  }

  async checkDailyMatchLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const consent = await prisma.parentalConsent.findFirst({
      where: { userId, status: 'approved' },
      select: { restrictions: true },
    });

    const maxDailyMatches = (consent?.restrictions as any)?.maxDailyMatches || 5;

    const today = new Date().toISOString().split('T')[0];
    const todayMatches = await prisma.matchHistory.count({
      where: {
        userId,
        matchedAt: { gte: new Date(today) },
      },
    });

    const remaining = Math.max(0, maxDailyMatches - todayMatches);

    return {
      allowed: remaining > 0,
      remaining,
      limit: maxDailyMatches,
    };
  }

  async getActiveConsents(): Promise<number> {
    return prisma.parentalConsent.count({
      where: { status: 'approved' },
    });
  }

  async cleanupExpiredConsents(): Promise<number> {
    const result = await prisma.parentalConsent.updateMany({
      where: {
        status: 'pending',
        consentExpiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired parental consents`);
    }

    return result.count;
  }
}

export const parentalConsentService = new ParentalConsentService();
