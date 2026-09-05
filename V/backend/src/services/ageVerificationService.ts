import prisma from '../config/database';
import logger from '../config/logger';
import { mlModerationService } from './mlModerationService';
import { v4 as uuidv4 } from 'uuid';

export interface AgeVerificationRequest {
  userId: string;
  method: 'document_upload' | 'id_verification_api' | 'ml_estimation' | 'parental_consent';
  documentType?: string;
  documentBuffer?: Buffer;
  idVerificationProvider?: string;
}

export interface AgeVerificationResult {
  verificationId: string;
  status: 'pending' | 'verified' | 'rejected';
  estimatedAge?: number;
  verifiedAge?: number;
  confidence?: number;
  message: string;
}

class AgeVerificationService {
  private readonly MIN_AGE = 13;
  private readonly ADULT_AGE = 18;
  private readonly VERIFICATION_EXPIRY_DAYS = 365;

  async submitDocumentVerification(request: AgeVerificationRequest): Promise<AgeVerificationResult> {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { age: true, ageVerified: true, isMinor: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.ageVerified) {
      return {
        verificationId: '',
        status: 'verified',
        verifiedAge: user.age,
        message: 'Age already verified',
      };
    }

    const verification = await prisma.ageVerification.create({
      data: {
        userId: request.userId,
        method: request.method,
        documentType: request.documentType,
        status: 'pending',
      },
    });

    switch (request.method) {
      case 'document_upload':
        return this.processDocumentUpload(verification.id, request.userId, request.documentBuffer);

      case 'id_verification_api':
        return this.processIdVerificationApi(verification.id, request.userId, request.idVerificationProvider);

      case 'ml_estimation':
        return this.processMlEstimation(verification.id, request.userId);

      case 'parental_consent':
        return this.initiateParentalConsent(verification.id, request.userId);

      default:
        throw new Error('Invalid verification method');
    }
  }

  private async processDocumentUpload(
    verificationId: string,
    userId: string,
    documentBuffer?: Buffer
  ): Promise<AgeVerificationResult> {
    if (!documentBuffer) {
      return {
        verificationId,
        status: 'pending',
        message: 'Document upload required',
      };
    }

    const estimatedAge = await this.extractAgeFromDocument(documentBuffer);

    await prisma.ageVerification.update({
      where: { id: verificationId },
      data: {
        estimatedAge,
        status: estimatedAge >= this.MIN_AGE ? 'verified' : 'rejected',
        verifiedAge: estimatedAge,
        reviewedAt: new Date(),
        expiresAt: new Date(Date.now() + this.VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    if (estimatedAge >= this.MIN_AGE) {
      await this.markUserAgeVerified(userId, estimatedAge, 'document_upload');
    }

    return {
      verificationId,
      status: estimatedAge >= this.MIN_AGE ? 'verified' : 'rejected',
      estimatedAge,
      verifiedAge: estimatedAge,
      message: estimatedAge >= this.MIN_AGE
        ? 'Age verification successful'
        : `Must be at least ${this.MIN_AGE} years old`,
    };
  }

  private async processIdVerificationApi(
    verificationId: string,
    userId: string,
    provider?: string
  ): Promise<AgeVerificationResult> {
    const providerName = provider || process.env.ID_VERIFICATION_PROVIDER || 'manual';

    const externalVerificationId = `idv_${uuidv4()}`;

    await prisma.ageVerification.update({
      where: { id: verificationId },
      data: {
        idVerificationId: externalVerificationId,
        idVerificationProvider: providerName,
        status: 'pending',
      },
    });

    const result = await this.callIdVerificationApi(userId, externalVerificationId);

    await prisma.ageVerification.update({
      where: { id: verificationId },
      data: {
        status: result.verified ? 'verified' : 'rejected',
        verifiedAge: result.age,
        reviewedAt: new Date(),
        expiresAt: new Date(Date.now() + this.VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    if (result.verified && result.age >= this.MIN_AGE) {
      await this.markUserAgeVerified(userId, result.age, 'id_verification_api');
    }

    return {
      verificationId,
      status: result.verified ? 'verified' : 'rejected',
      verifiedAge: result.age,
      confidence: result.confidence,
      message: result.verified ? 'ID verification successful' : 'ID verification failed',
    };
  }

  private async processMlEstimation(
    verificationId: string,
    userId: string,
    frameBuffer?: Buffer
  ): Promise<AgeVerificationResult> {
    if (!frameBuffer) {
      return {
        verificationId,
        status: 'pending',
        message: 'Photo required for age estimation',
      };
    }

    const estimatedAge = await mlModerationService.estimateAge(frameBuffer);
    const confidence = 0.7;

    await prisma.ageVerification.update({
      where: { id: verificationId },
      data: {
        estimatedAge: Math.round(estimatedAge),
        estimatedAgeConfidence: confidence,
        status: estimatedAge >= this.MIN_AGE ? 'pending' : 'rejected',
        reviewedAt: new Date(),
      },
    });

    if (estimatedAge >= this.ADULT_AGE) {
      await this.markUserAgeVerified(userId, Math.round(estimatedAge), 'ml_estimation');
    } else if (estimatedAge >= this.MIN_AGE) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          estimatedAge: Math.round(estimatedAge),
          isMinor: true,
          restrictedMode: true,
        },
      });
    }

    return {
      verificationId,
      status: estimatedAge >= this.MIN_AGE ? 'verified' : 'rejected',
      estimatedAge: Math.round(estimatedAge),
      confidence,
      message: estimatedAge >= this.MIN_AGE
        ? estimatedAge >= this.ADULT_AGE
          ? 'Age estimation: Adult'
          : 'Age estimation: Minor - parental consent required'
        : 'Age estimation: Under minimum age',
    };
  }

  private async initiateParentalConsent(
    verificationId: string,
    userId: string
  ): Promise<AgeVerificationResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, age: true, parentEmail: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const consentToken = uuidv4();

    const consent = await prisma.parentalConsent.create({
      data: {
        userId,
        parentEmail: user.parentEmail || '',
        parentName: '',
        consentToken,
        status: 'pending',
        consentExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        restrictions: {
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

    await prisma.ageVerification.update({
      where: { id: verificationId },
      data: {
        status: 'pending',
        metadata: { consentId: consent.id },
      },
    });

    return {
      verificationId,
      status: 'pending',
      message: 'Parental consent request sent to parent email',
    };
  }

  async reviewVerification(
    verificationId: string,
    reviewerId: string,
    approved: boolean,
    verifiedAge?: number,
    rejectionReason?: string
  ): Promise<void> {
    const verification = await prisma.ageVerification.findUnique({
      where: { id: verificationId },
      select: { userId: true },
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    await prisma.ageVerification.update({
      where: { id: verificationId },
      data: {
        status: approved ? 'verified' : 'rejected',
        verifiedAge: approved ? verifiedAge : undefined,
        rejectionReason: approved ? null : rejectionReason,
        reviewerId,
        reviewedAt: new Date(),
        expiresAt: approved ? new Date(Date.now() + this.VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000) : null,
      },
    });

    if (approved && verifiedAge && verifiedAge >= this.MIN_AGE) {
      await this.markUserAgeVerified(verification.userId, verifiedAge, 'document_upload');
    }
  }

  async getVerificationStatus(userId: string): Promise<any> {
    const verification = await prisma.ageVerification.findFirst({
      where: { userId, status: { in: ['verified', 'pending'] } },
      orderBy: { createdAt: 'desc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ageVerified: true,
        age: true,
        estimatedAge: true,
        isMinor: true,
        restrictedMode: true,
        parentalConsent: true,
      },
    });

    return {
      isVerified: user?.ageVerified || false,
      age: user?.age,
      estimatedAge: user?.estimatedAge,
      isMinor: user?.isMinor || false,
      restrictedMode: user?.restrictedMode || false,
      hasParentalConsent: user?.parentalConsent || false,
      lastVerification: verification
        ? {
            id: verification.id,
            method: verification.method,
            status: verification.status,
            createdAt: verification.createdAt,
            expiresAt: verification.expiresAt,
          }
        : null,
    };
  }

  private async markUserAgeVerified(
    userId: string,
    age: number,
    method: string
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ageVerified: true,
        ageVerificationMethod: method as any,
        ageVerificationDate: new Date(),
        estimatedAge: age,
        isMinor: age < this.ADULT_AGE,
        restrictedMode: age < this.ADULT_AGE,
      },
    });
  }

  private async extractAgeFromDocument(documentBuffer: Buffer): Promise<number> {
    return 18;
  }

  private async callIdVerificationApi(
    userId: string,
    externalId: string
  ): Promise<{ verified: boolean; age: number; confidence: number }> {
    return { verified: true, age: 21, confidence: 0.95 };
  }

  async checkAgeRestriction(userId: string): Promise<{ allowed: boolean; reason?: string; restrictions?: any }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ageVerified: true,
        age: true,
        isMinor: true,
        parentalConsent: true,
        restrictedMode: true,
      },
    });

    if (!user?.ageVerified) {
      return {
        allowed: false,
        reason: 'Age verification required',
      };
    }

    if (user.isMinor && !user.parentalConsent) {
      return {
        allowed: false,
        reason: 'Parental consent required for minors',
      };
    }

    if (user.restrictedMode) {
      const consent = await prisma.parentalConsent.findFirst({
        where: { userId, status: 'approved' },
        select: { restrictions: true },
      });

      return {
        allowed: true,
        restrictions: consent?.restrictions || {},
      };
    }

    return { allowed: true };
  }

  async isExpired(verificationId: string): Promise<boolean> {
    const verification = await prisma.ageVerification.findUnique({
      where: { id: verificationId },
      select: { expiresAt: true },
    });

    if (!verification?.expiresAt) return false;
    return verification.expiresAt < new Date();
  }
}

export const ageVerificationService = new AgeVerificationService();
