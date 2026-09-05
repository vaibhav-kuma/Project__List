import { Router } from 'express';
import {
  submitAgeVerification,
  getAgeVerificationStatus,
  requestParentalConsent,
  getConsentByToken,
  approveParentalConsent,
  revokeParentalConsent,
  getConsentHistory,
  checkParentalRestrictions,
  requestDataExport,
  getExportStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
  getLegalDocument,
  getAllLegalDocuments,
  acceptLegalDocument,
  getConsentStatus,
  triggerEmergencyExit,
  getSafetyTip,
  reportSuspiciousBehavior,
  reportLocationSpoofing,
  getSafetyStatus,
  getSafetyTips,
  logSafetyEvent,
} from '../controllers/complianceController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Age Verification
router.post('/age-verification', authenticate, submitAgeVerification);
router.get('/age-verification/status', authenticate, getAgeVerificationStatus);

// Parental Consent
router.post('/parental-consent', authenticate, requestParentalConsent);
router.get('/parental-consent/:token', getConsentByToken);
router.post('/parental-consent/approve', approveParentalConsent);
router.post('/parental-consent/revoke', authenticate, revokeParentalConsent);
router.get('/parental-consent/history', authenticate, getConsentHistory);
router.get('/parental-consent/restrictions', authenticate, checkParentalRestrictions);

// GDPR - Data Export
router.post('/data-export', authenticate, requestDataExport);
router.get('/data-export/:exportId', authenticate, getExportStatus);

// GDPR - Account Deletion
router.post('/account-deletion', authenticate, requestAccountDeletion);
router.post('/account-deletion/cancel', authenticate, cancelAccountDeletion);

// Legal Documents
router.get('/legal-documents', getAllLegalDocuments);
router.get('/legal-documents/:type', getLegalDocument);
router.post('/legal-documents/accept', authenticate, acceptLegalDocument);
router.get('/consent-status', authenticate, getConsentStatus);

// Safety Features
router.post('/safety/emergency-exit', authenticate, triggerEmergencyExit);
router.get('/safety/tip', authenticate, getSafetyTip);
router.get('/safety/tips', getSafetyTips);
router.post('/safety/suspicious-behavior', authenticate, reportSuspiciousBehavior);
router.post('/safety/location-spoofing', authenticate, reportLocationSpoofing);
router.get('/safety/status', authenticate, getSafetyStatus);
router.post('/safety/event', authenticate, logSafetyEvent);

export default router;
