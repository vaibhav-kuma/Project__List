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

export const adminApi = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAnalytics: () => api.get('/admin/analytics'),
  getSystemHealth: () => api.get('/admin/health'),
  getPerformanceMetrics: () => api.get('/admin/performance'),
  getErrorLogs: (params?: { page?: number; limit?: number; hours?: number }) =>
    api.get('/admin/error-logs', { params }),

  // Users
  getUsers: (params?: {
    search?: string;
    status?: string;
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    isPremium?: boolean;
    isVerified?: boolean;
    ageVerified?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) => api.get('/admin/users', { params }),

  getUserDetail: (userId: string) => api.get(`/admin/users/${userId}`),
  banUser: (userId: string, data: { reason: string; duration?: number }) =>
    api.post(`/admin/users/${userId}/ban`, data),
  unbanUser: (userId: string) => api.post(`/admin/users/${userId}/unban`),
  verifyUserAge: (userId: string, data: { verified: boolean; verifiedAge?: number; notes?: string }) =>
    api.post(`/admin/users/${userId}/verify-age`, data),

  // Moderation
  getReports: (params?: { status?: string; page?: number; limit?: number; type?: string }) =>
    api.get('/admin/reports', { params }),
  resolveReport: (reportId: string, data: { action: string; notes?: string }) =>
    api.post(`/admin/reports/${reportId}/resolve`, data),
  getModerationQueue: () => api.get('/admin/moderation-queue'),
  getFlaggedContent: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/flagged-content', { params }),
  moderateContent: (momentId: string, data: { action: string; reason?: string }) =>
    api.post(`/admin/moments/${momentId}/moderate`, data),

  // Content Management
  createAnnouncement: (data: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'critical';
    targetAudience?: 'all' | 'premium' | 'free' | 'minors';
  }) => api.post('/admin/announcements', data),
};

export default adminApi;
