import { create } from 'zustand';
import axios from 'axios';

export interface Notification {
  id: string;
  type: 'match' | 'friend_request' | 'friend_accept' | 'moment_like' | 'moment_reply' | 'message' | 'system' | 'moderation' | 'subscription' | 'verification';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  fetchNotifications: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteOldNotifications: (days?: number) => Promise<void>;
  addNotification: (notification: Notification) => void;
  reset: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  initialized: false,

  fetchNotifications: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/notifications', { params });
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        loading: false,
        initialized: true,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load notifications', loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      set({ unreadCount: data.unreadCount });
    } catch {}
  },

  markAsRead: async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to mark as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      await api.post('/notifications/mark-all-read');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to mark all as read' });
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: state.unreadCount - (state.notifications.find((n) => n.id === notificationId)?.isRead ? 0 : 1),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete notification' });
    }
  },

  deleteOldNotifications: async (days = 30) => {
    try {
      await api.delete('/notifications/old', { params: { days } });
      get().fetchNotifications();
    } catch {}
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    }));
  },

  reset: () => {
    set({ notifications: [], unreadCount: 0, initialized: false });
  },
}));
