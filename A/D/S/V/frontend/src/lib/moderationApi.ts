import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  sessionId?: string;
  momentId?: string;
  reason: string;
  description?: string;
  evidenceUrls: string[];
  screenshotUrl?: string;
  severity: number;
  priority: number;
  status: string;
  actionTaken?: string;
  resolutionNotes?: string;
  createdAt: string;
  reporter?: { id: string; displayName: string };
  reportedUser?: { id: string; displayName: string; severityScore: number };
}

export interface ModerationAction {
  id: string;
  userId: string;
  actionType: string;
  reason: string;
  durationHours?: number;
  expiresAt?: string;
  moderatorId?: string;
  isAuto: boolean;
  appealStatus: string;
  appealNotes?: string;
  createdAt: string;
  user?: { id: string; displayName: string; email: string };
}

export interface UserModerationHistory {
  strikes: {
    userId: string;
    strikeCount: number;
    strikes: Array<{
      id: string;
      reason: string;
      actionType: string;
      createdAt: string;
      expiresAt?: string;
    }>;
    nextAction: string;
  };
  reports: any[];
  actions: any[];
  severityScore: number;
}

export const moderationApi = {
  submitReport: async (data: {
    reportedUserId: string;
    sessionId?: string;
    momentId?: string;
    reason: string;
    description?: string;
    evidenceUrls?: string[];
    screenshotUrl?: string;
  }) => {
    const response = await api.post('/moderation/report', data);
    return response.data;
  },

  getMyReports: async () => {
    const response = await api.get('/moderation/my-reports');
    return response.data;
  },

  getMyAppeals: async () => {
    const response = await api.get('/moderation/my-appeals');
    return response.data;
  },

  submitAppeal: async (data: {
    moderationActionId: string;
    reason: string;
    evidenceUrls?: string[];
  }) => {
    const response = await api.post('/moderation/appeal', data);
    return response.data;
  },

  getModerationQueue: async (params?: { status?: string; limit?: number; priority?: number }) => {
    const response = await api.get('/moderation/queue', { params });
    return response.data;
  },

  updateReport: async (reportId: string, data: {
    status?: string;
    actionTaken?: string;
    resolutionNotes?: string;
  }) => {
    const response = await api.put(`/moderation/report/${reportId}`, data);
    return response.data;
  },

  getReportsAgainstUser: async (userId: string) => {
    const response = await api.get(`/moderation/user/${userId}/reports`);
    return response.data;
  },

  getPendingAppeals: async () => {
    const response = await api.get('/moderation/appeals/pending');
    return response.data;
  },

  reviewAppeal: async (appealId: string, data: { decision: 'approved' | 'denied'; notes?: string }) => {
    const response = await api.post(`/moderation/appeal/${appealId}/review`, data);
    return response.data;
  },

  getDashboardOverview: async () => {
    const response = await api.get('/moderation/dashboard');
    return response.data;
  },

  getUserDetails: async (userId: string) => {
    const response = await api.get(`/moderation/user/${userId}`);
    return response.data;
  },

  banUser: async (data: {
    userId: string;
    reason: string;
    duration?: 'temporary' | 'permanent' | 'shadow';
    durationHours?: number;
  }) => {
    const response = await api.post('/moderation/ban', data);
    return response.data;
  },

  warnUser: async (data: { userId: string; reason: string }) => {
    const response = await api.post('/moderation/warn', data);
    return response.data;
  },

  clearUser: async (data: { userId: string; reason: string }) => {
    const response = await api.post('/moderation/clear', data);
    return response.data;
  },

  getBannedUsers: async (params?: { type?: string; limit?: number }) => {
    const response = await api.get('/moderation/banned', { params });
    return response.data;
  },

  getModerationLogs: async (params?: { limit?: number; actionType?: string; moderatorId?: string }) => {
    const response = await api.get('/moderation/logs', { params });
    return response.data;
  },

  updateMLThresholds: async (thresholds: Record<string, number>) => {
    const response = await api.put('/moderation/ml/thresholds', { thresholds });
    return response.data;
  },

  getMLStats: async () => {
    const response = await api.get('/moderation/ml/stats');
    return response.data;
  },
};

export default moderationApi;
