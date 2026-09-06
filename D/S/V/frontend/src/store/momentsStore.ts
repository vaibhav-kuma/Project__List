import { create } from 'zustand';
import axios from 'axios';

interface MomentUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

interface Moment {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  thumbnailUrl?: string;
  caption?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  visibility: string;
  filters: string[];
  stickers?: any;
  createdAt: string;
  expiresAt: string;
  user?: MomentUser;
  hasViewed?: boolean;
  hasLiked?: boolean;
}

interface MomentReply {
  id: string;
  momentId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: MomentUser;
}

interface MomentsState {
  moments: Moment[];
  discoverMoments: Moment[];
  userMoments: Moment[];
  currentMoment: Moment | null;
  momentViews: Array<{ user: MomentUser; viewedAt: string }> | null;
  loading: boolean;
  error: string | null;
  fetchFeed: () => Promise<void>;
  fetchDiscover: () => Promise<void>;
  fetchUserMoments: (userId: string) => Promise<void>;
  fetchMoment: (momentId: string) => Promise<void>;
  createMoment: (data: CreateMomentData) => Promise<void>;
  viewMoment: (momentId: string) => Promise<void>;
  likeMoment: (momentId: string) => Promise<boolean>;
  replyToMoment: (momentId: string, content: string) => Promise<void>;
  getMomentViews: (momentId: string) => Promise<void>;
  deleteMoment: (momentId: string) => Promise<void>;
  getUploadUrl: (fileName: string, contentType: string, isVideo?: boolean) => Promise<{ uploadUrl: string; publicUrl: string; key: string; thumbnailUrl?: string }>;
  setCurrentMoment: (moment: Moment | null) => void;
}

interface CreateMomentData {
  mediaUrl: string;
  mediaPublicId: string;
  mediaType: 'image' | 'video' | 'gif';
  caption?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  visibility?: 'public' | 'friends';
  filters?: string[];
  stickers?: any[];
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

export const useMomentsStore = create<MomentsState>((set, get) => ({
  moments: [],
  discoverMoments: [],
  userMoments: [],
  currentMoment: null,
  momentViews: null,
  loading: false,
  error: null,

  fetchFeed: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/moments/feed');
      set({ moments: data.moments, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load moments', loading: false });
    }
  },

  fetchDiscover: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/moments/discover');
      set({ discoverMoments: data.moments, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load discover', loading: false });
    }
  },

  fetchUserMoments: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get(`/moments/user/${userId}`);
      set({ userMoments: data.moments, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load user moments', loading: false });
    }
  },

  fetchMoment: async (momentId: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get(`/moments/${momentId}`);
      set({ currentMoment: data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load moment', loading: false });
    }
  },

  createMoment: async (data: CreateMomentData) => {
    set({ loading: true, error: null });
    try {
      await api.post('/moments', data);
      set({ loading: false });
      await get().fetchFeed();
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create moment', loading: false });
      throw error;
    }
  },

  viewMoment: async (momentId: string) => {
    try {
      await api.post(`/moments/${momentId}/view`);
      set((state) => ({
        moments: state.moments.map((m) =>
          m.id === momentId ? { ...m, hasViewed: true, viewCount: m.viewCount + 1 } : m
        ),
      }));
    } catch {
    }
  },

  likeMoment: async (momentId: string) => {
    try {
      const { data } = await api.post(`/moments/${momentId}/like`);
      set((state) => ({
        moments: state.moments.map((m) =>
          m.id === momentId
            ? { ...m, hasLiked: data.liked, likeCount: data.liked ? m.likeCount + 1 : m.likeCount - 1 }
            : m
        ),
        discoverMoments: state.discoverMoments.map((m) =>
          m.id === momentId
            ? { ...m, hasLiked: data.liked, likeCount: data.liked ? m.likeCount + 1 : m.likeCount - 1 }
            : m
        ),
        userMoments: state.userMoments.map((m) =>
          m.id === momentId
            ? { ...m, hasLiked: data.liked, likeCount: data.liked ? m.likeCount + 1 : m.likeCount - 1 }
            : m
        ),
      }));
      return data.liked;
    } catch {
      return false;
    }
  },

  replyToMoment: async (momentId: string, content: string) => {
    try {
      await api.post(`/moments/${momentId}/reply`, { content });
      set((state) => ({
        moments: state.moments.map((m) =>
          m.id === momentId ? { ...m, replyCount: m.replyCount + 1 } : m
        ),
      }));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to reply');
    }
  },

  getMomentViews: async (momentId: string) => {
    try {
      const { data } = await api.get(`/moments/${momentId}/views`);
      set({ momentViews: data.views });
    } catch {
    }
  },

  deleteMoment: async (momentId: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/moments/${momentId}`);
      set((state) => ({
        moments: state.moments.filter((m) => m.id !== momentId),
        userMoments: state.userMoments.filter((m) => m.id !== momentId),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete moment', loading: false });
    }
  },

  getUploadUrl: async (fileName: string, contentType: string, isVideo?: boolean) => {
    const { data } = await api.post('/upload/moment', { fileName, contentType, isVideo });
    return data;
  },

  setCurrentMoment: (moment: Moment | null) => {
    set({ currentMoment: moment });
  },
}));
