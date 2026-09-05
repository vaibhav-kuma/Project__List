import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';
import { ageVerificationService } from '../services/ageVerificationService';
import { parentalConsentService } from '../services/parentalConsentService';
import { gdprService } from '../services/gdprService';
import { safetyService } from '../services/safetyService';
import { legalContentService, LegalDocumentType } from '../services/legalContentService';

const ageVerificationSchema = z.object({
  method: z.enum(['document_upload', 'id_verification_api', 'ml_estimation', 'parental_consent']),
  documentType: z.string().optional(),
  idVerificationProvider: z.string().optional(),
});

const parentalConsentSchema = z.object({
  userId: z.string().uuid(),
  parentEmail: z.string().email(),
  parentName: z.string().min(2),
  restrictions: z.object({
    maxDailyMatches: z.number().int().positive().optional(),
    noVideoChat: z.boolean().optional(),
    noMessaging: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    timeRestrictions: z.object({
      startHour: z.number().int().min(0).max(23).optional(),
      endHour: z.number().int().min(0).max(23).optional(),
    }).optional(),
  }).optional(),
});

const approveConsentSchema = z.object({
  token: z.string(),
  parentSignature: z.string().optional(),
});

const dataExportSchema = z.object({
  format: z.enum(['json', 'csv']).optional(),
  includeMessages: z.boolean().optional(),
  includeMoments: z.boolean().optional(),
  includeFriends: z.boolean().optional(),
  includeReports: z.boolean().optional(),
  includePayments: z.boolean().optional(),
});

const accountDeletionSchema = z.object({
  reason: z.string().max(500).optional(),
  confirmation: z.literal(true),
});

const acceptDocumentSchema = z.object({
  documentType: z.enum(['terms_of_service', 'privacy_policy', 'community_guidelines', 'cookie_policy', 'data_processing_agreement', 'parental_consent_form']),
  version: z.string(),
});

const safetyEventSchema = z.object({
  eventType: z.enum(['emergency_exit', 'suspicious_behavior_warning', 'location_spoofing_detected', 'safety_tip_shown', 'block_user', 'safety_check_triggered']),
  sessionId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export const submitAgeVerification = async (req: AuthRequest, res: Response) => {
  try {
    const body = ageVerificationSchema.parse(req.body);

    const result = await ageVerificationService.submitDocumentVerification({
      userId: req.userId!,
      ...body,
    });

    res.json(result);
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

export const getAgeVerificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const status = await ageVerificationService.getVerificationStatus(req.userId!);
    res.json(status);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestParentalConsent = async (req: AuthRequest, res: Response) => {
  try {
    const body = parentalConsentSchema.parse(req.body);

    const result = await parentalConsentService.requestConsent(body);

    res.json(result);
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

export const getConsentByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const consent = await parentalConsentService.getConsentByToken(token);
    res.json(consent);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveParentalConsent = async (req: Request, res: Response) => {
  try {
    const body = approveConsentSchema.parse(req.body);

    const result = await parentalConsentService.approveConsent(body.token, body.parentSignature);

    res.json(result);
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

export const revokeParentalConsent = async (req: AuthRequest, res: Response) => {
  try {
    const result = await parentalConsentService.revokeConsent(req.userId!, 'user');

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConsentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const history = await parentalConsentService.getConsentHistory(req.userId!);
    res.json({ history });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkParentalRestrictions = async (req: AuthRequest, res: Response) => {
  try {
    const [timeRestriction, matchLimit] = await Promise.all([
      parentalConsentService.checkTimeRestriction(req.userId!),
      parentalConsentService.checkDailyMatchLimit(req.userId!),
    ]);

    res.json({
      timeRestriction,
      matchLimit,
      canUseApp: timeRestriction.allowed && matchLimit.allowed,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestDataExport = async (req: AuthRequest, res: Response) => {
  try {
    const body = dataExportSchema.parse(req.body);

    const result = await gdprService.requestDataExport({
      userId: req.userId!,
      ...body,
    });

    res.json(result);
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

export const getExportStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { exportId } = req.params;
    const status = await gdprService.getExportStatus(exportId);

    if (!status) {
      return res.status(404).json({ error: 'Export not found' });
    }

    res.json(status);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestAccountDeletion = async (req: AuthRequest, res: Response) => {
  try {
    const body = accountDeletionSchema.parse(req.body);

    const result = await gdprService.requestAccountDeletion(req.userId!, body.reason);

    res.json(result);
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

export const cancelAccountDeletion = async (req: AuthRequest, res: Response) => {
  try {
    const result = await gdprService.cancelAccountDeletion(req.userId!);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLegalDocument = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { language = 'en' } = req.query;

    const document = await legalContentService.getActiveDocument(
      type as LegalDocumentType,
      language as string
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllLegalDocuments = async (req: Request, res: Response) => {
  try {
    const { language = 'en' } = req.query;
    const documents = await legalContentService.getAllActiveDocuments(language as string);
    res.json({ documents });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptLegalDocument = async (req: AuthRequest, res: Response) => {
  try {
    const body = acceptDocumentSchema.parse(req.body);

    await legalContentService.acceptDocument(
      req.userId!,
      body.documentType,
      body.version,
      req.ip,
      req.headers['user-agent']
    );

    res.json({ message: 'Document acceptance recorded' });
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

export const getConsentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const status = await legalContentService.getUserConsentStatus(req.userId!);
    res.json(status);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const triggerEmergencyExit = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body;

    const result = await safetyService.handleEmergencyExit(req.userId!, sessionId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSafetyTip = async (req: AuthRequest, res: Response) => {
  try {
    const result = await safetyService.showSafetyTip(req.userId!);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reportSuspiciousBehavior = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, warningType } = req.body;

    const result = await safetyService.warnSuspiciousBehavior(
      req.userId!,
      sessionId,
      warningType
    );

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reportLocationSpoofing = async (req: AuthRequest, res: Response) => {
  try {
    const { location } = req.body;

    const result = await safetyService.detectLocationSpoofing(req.userId!, location);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSafetyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const status = await safetyService.getSafetyStatus(req.userId!);
    res.json(status);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSafetyTips = async (req: Request, res: Response) => {
  try {
    const tips = await safetyService.getSafetyTips();
    res.json({ tips });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logSafetyEvent = async (req: AuthRequest, res: Response) => {
  try {
    const body = safetyEventSchema.parse(req.body);

    await safetyService.logSafetyEvent({
      userId: req.userId!,
      ...body,
    });

    res.json({ message: 'Safety event logged' });
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
