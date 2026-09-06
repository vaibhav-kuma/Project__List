import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const complianceApi = {
  // Age Verification
  submitAgeVerification: (data: {
    method: 'document_upload' | 'id_verification_api' | 'ml_estimation' | 'parental_consent';
    documentType?: string;
    idVerificationProvider?: string;
  }) => api.post('/compliance/age-verification', data),

  getAgeVerificationStatus: () => api.get('/compliance/age-verification/status'),

  // Parental Consent
  requestParentalConsent: (data: {
    userId: string;
    parentEmail: string;
    parentName: string;
    restrictions?: any;
  }) => api.post('/compliance/parental-consent', data),

  getConsentByToken: (token: string) => api.get(`/compliance/parental-consent/${token}`),

  approveParentalConsent: (data: { token: string; parentSignature?: string }) =>
    api.post('/compliance/parental-consent/approve', data),

  revokeParentalConsent: () => api.post('/compliance/parental-consent/revoke'),

  getConsentHistory: () => api.get('/compliance/parental-consent/history'),

  checkParentalRestrictions: () => api.get('/compliance/parental-consent/restrictions'),

  // GDPR - Data Export
  requestDataExport: (data: {
    format?: 'json' | 'csv';
    includeMessages?: boolean;
    includeMoments?: boolean;
    includeFriends?: boolean;
    includeReports?: boolean;
    includePayments?: boolean;
  }) => api.post('/compliance/data-export', data),

  getExportStatus: (exportId: string) => api.get(`/compliance/data-export/${exportId}`),

  // GDPR - Account Deletion
  requestAccountDeletion: (data: { reason?: string; confirmation: true }) =>
    api.post('/compliance/account-deletion', data),

  cancelAccountDeletion: () => api.post('/compliance/account-deletion/cancel'),

  // Legal Documents
  getLegalDocument: (type: string, language?: string) =>
    api.get(`/compliance/legal-documents/${type}`, { params: { language } }),

  getAllLegalDocuments: (language?: string) =>
    api.get('/compliance/legal-documents', { params: { language } }),

  acceptLegalDocument: (data: { documentType: string; version: string }) =>
    api.post('/compliance/legal-documents/accept', data),

  getConsentStatus: () => api.get('/compliance/consent-status'),

  // Safety
  triggerEmergencyExit: (sessionId?: string) =>
    api.post('/compliance/safety/emergency-exit', { sessionId }),

  getSafetyTip: () => api.get('/compliance/safety/tip'),

  getSafetyTips: () => api.get('/compliance/safety/tips'),

  reportSuspiciousBehavior: (data: { sessionId: string; warningType: string }) =>
    api.post('/compliance/safety/suspicious-behavior', data),

  reportLocationSpoofing: (location: any) =>
    api.post('/compliance/safety/location-spoofing', { location }),

  getSafetyStatus: () => api.get('/compliance/safety/status'),

  logSafetyEvent: (data: {
    eventType: string;
    sessionId?: string;
    description?: string;
    metadata?: any;
  }) => api.post('/compliance/safety/event', data),
};

export default complianceApi;
