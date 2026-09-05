import { create } from 'zustand';
import { moderationApi, Report, ModerationAction } from '@/lib/moderationApi';

interface ModerationState {
  queue: Report[];
  queueStats: any;
  dashboardOverview: any;
  bannedUsers: any[];
  moderationLogs: any[];
  pendingAppeals: any[];
  mlStats: any;
  loading: boolean;
  error: string | null;

  fetchQueue: (params?: any) => Promise<void>;
  updateReport: (reportId: string, data: any) => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchBannedUsers: (params?: any) => Promise<void>;
  fetchModerationLogs: (params?: any) => Promise<void>;
  fetchPendingAppeals: () => Promise<void>;
  reviewAppeal: (appealId: string, data: any) => Promise<void>;
  banUser: (data: any) => Promise<void>;
  warnUser: (data: any) => Promise<void>;
  clearUser: (data: any) => Promise<void>;
  fetchMLStats: () => Promise<void>;
  updateMLThresholds: (thresholds: any) => Promise<void>;
  clearError: () => void;
}

export const useModerationStore = create<ModerationState>((set, get) => ({
  queue: [],
  queueStats: null,
  dashboardOverview: null,
  bannedUsers: [],
  moderationLogs: [],
  pendingAppeals: [],
  mlStats: null,
  loading: false,
  error: null,

  fetchQueue: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await moderationApi.getModerationQueue(params);
      set({ queue: data.reports, queueStats: data.queueStats, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch queue', loading: false });
    }
  },

  updateReport: async (reportId, data) => {
    set({ loading: true, error: null });
    try {
      await moderationApi.updateReport(reportId, data);
      await get().fetchQueue();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update report', loading: false });
    }
  },

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const data = await moderationApi.getDashboardOverview();
      set({ dashboardOverview: data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch dashboard', loading: false });
    }
  },

  fetchBannedUsers: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await moderationApi.getBannedUsers(params);
      set({ bannedUsers: data.users, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch banned users', loading: false });
    }
  },

  fetchModerationLogs: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await moderationApi.getModerationLogs(params);
      set({ moderationLogs: data.logs, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch logs', loading: false });
    }
  },

  fetchPendingAppeals: async () => {
    set({ loading: true, error: null });
    try {
      const data = await moderationApi.getPendingAppeals();
      set({ pendingAppeals: data.appeals, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch appeals', loading: false });
    }
  },

  reviewAppeal: async (appealId, data) => {
    set({ loading: true, error: null });
    try {
      await moderationApi.reviewAppeal(appealId, data);
      await get().fetchPendingAppeals();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to review appeal', loading: false });
    }
  },

  banUser: async (data) => {
    set({ loading: true, error: null });
    try {
      await moderationApi.banUser(data);
      await get().fetchBannedUsers();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to ban user', loading: false });
    }
  },

  warnUser: async (data) => {
    set({ loading: true, error: null });
    try {
      await moderationApi.warnUser(data);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to warn user', loading: false });
    }
  },

  clearUser: async (data) => {
    set({ loading: true, error: null });
    try {
      await moderationApi.clearUser(data);
      await get().fetchBannedUsers();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to clear user', loading: false });
    }
  },

  fetchMLStats: async () => {
    set({ loading: true, error: null });
    try {
      const data = await moderationApi.getMLStats();
      set({ mlStats: data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch ML stats', loading: false });
    }
  },

  updateMLThresholds: async (thresholds) => {
    set({ loading: true, error: null });
    try {
      await moderationApi.updateMLThresholds(thresholds);
      await get().fetchMLStats();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update thresholds', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
