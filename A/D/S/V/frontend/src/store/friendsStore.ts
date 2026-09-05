import { create } from 'zustand';
import axios from 'axios';

interface Friend {
  id: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
  lastChatAt?: string;
  chatCount: number;
  isFavorite: boolean;
  isMuted: boolean;
  isPremium?: boolean;
}

interface FriendRequest {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isPremium?: boolean;
  };
  createdAt: string;
}

interface FriendsState {
  friends: Friend[];
  pendingReceived: FriendRequest[];
  pendingSent: FriendRequest[];
  loading: boolean;
  error: string | null;
  fetchFriends: () => Promise<void>;
  fetchPending: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (friendId: string) => Promise<void>;
  rejectRequest: (friendId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  startCall: (friendId: string) => Promise<void>;
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

export const useFriendsStore = create<FriendsState>((set) => ({
  friends: [],
  pendingReceived: [],
  pendingSent: [],
  loading: false,
  error: null,

  fetchFriends: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/friends');
      set({ friends: data.friends, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load friends', loading: false });
    }
  },

  fetchPending: async () => {
    try {
      const { data } = await api.get('/friends/pending');
      set({ pendingReceived: data.received, pendingSent: data.sent });
    } catch {
    }
  },

  sendRequest: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/friends/request', { userId });
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to send request', loading: false });
      throw error;
    }
  },

  acceptRequest: async (friendId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/friends/${friendId}/accept`);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to accept', loading: false });
      throw error;
    }
  },

  rejectRequest: async (friendId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/friends/${friendId}/reject`);
      set((state) => ({
        pendingReceived: state.pendingReceived.filter((r) => r.id !== friendId),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to reject', loading: false });
      throw error;
    }
  },

  removeFriend: async (friendId: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/friends/${friendId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f.id !== friendId),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to remove', loading: false });
      throw error;
    }
  },

  blockUser: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/friends/block', { userId });
      set((state) => ({
        friends: state.friends.filter((f) => f.id !== userId),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to block', loading: false });
      throw error;
    }
  },

  unblockUser: async (userId: string) => {
    set({ error: null });
    try {
      await api.post('/friends/unblock', { userId });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to unblock', loading: false });
      throw error;
    }
  },

  startCall: async (friendId: string) => {
    set({ error: null });
    try {
      const { data } = await api.post(`/friends/${friendId}/call`);
      const callUrl = data?.roomUrl || data?.session?.roomUrl;
      if (callUrl) {
        window.open(callUrl, '_blank');
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to start call', loading: false });
      throw error;
    }
  },
}));
