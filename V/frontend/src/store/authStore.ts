import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  age: number;
  gender: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  isPremium: boolean;
  premiumTier?: string;
  twoFactorEnabled?: boolean;
  status: string;
  profile?: any;
  preferences?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<{ requiresTwoFactor: boolean } | void>;
  register: (data: RegisterData) => Promise<{ requiresVerification: any } | void>;
  socialLogin: (provider: string, token: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  updatePrivacy: (settings: PrivacySettings) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  verifyPhone: (phone: string, code: string) => Promise<void>;
  setup2FA: () => Promise<{ secret: string; otpauthUrl: string }>;
  enable2FA: (token: string) => Promise<void>;
  disable2FA: (token: string) => Promise<void>;
}

interface LoginData {
  email?: string;
  phone?: string;
  password: string;
  twoFactorCode?: string;
}

interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  displayName: string;
  age: number;
  gender: string;
  bio?: string;
  acceptTerms: boolean;
  acceptPrivacyPolicy: boolean;
  parentalConsent?: boolean;
}

interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  gender?: string;
  avatarUrl?: string;
}

interface PrivacySettings {
  showAge?: boolean;
  showGender?: boolean;
  showLocation?: boolean;
  allowMessagesFrom?: string;
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  matchNotifications?: boolean;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  loading: false,
  error: null,

  login: async (data: LoginData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', data);
      const { user, token, refreshToken, requiresTwoFactor } = response.data;
      set({ user, token, refreshToken, loading: false });
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (requiresTwoFactor) {
        return { requiresTwoFactor: true };
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed', loading: false });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', data);
      const { user, token, requiresVerification } = response.data;
      set({ user, token, loading: false });
      localStorage.setItem('token', token);
      return { requiresVerification };
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Registration failed', loading: false });
      throw error;
    }
  },

  socialLogin: async (provider: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/social', { provider, token });
      const { user, token: authToken, refreshToken } = response.data;
      set({ user, token: authToken, refreshToken, loading: false });
      localStorage.setItem('token', authToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Social login failed', loading: false });
      throw error;
    }
  },

  logout: () => {
    set({ user: null, token: null, refreshToken: null });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/profile');
      set({ user: data.user });
    } catch (error) {
      console.error('Failed to fetch profile');
    }
  },

  updateProfile: async (data: UpdateProfileData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put('/auth/profile', data);
      set({ user: response.data.user, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Update failed', loading: false });
      throw error;
    }
  },

  updatePrivacy: async (settings: PrivacySettings) => {
    set({ loading: true, error: null });
    try {
      await api.put('/auth/privacy', settings);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Update failed', loading: false });
      throw error;
    }
  },

  changePassword: async (data: ChangePasswordData) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/change-password', data);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Password change failed', loading: false });
      throw error;
    }
  },

  deleteAccount: async (password: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/delete-account', { password, confirmDelete: true });
      get().logout();
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Delete failed', loading: false });
      throw error;
    }
  },

  verifyEmail: async (email: string, code: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/verify-email', { email, code });
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Verification failed', loading: false });
      throw error;
    }
  },

  verifyPhone: async (phone: string, code: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/verify-phone', { phone, code });
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Verification failed', loading: false });
      throw error;
    }
  },

  setup2FA: async () => {
    try {
      const { data } = await api.post('/auth/2fa/setup');
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '2FA setup failed');
    }
  },

  enable2FA: async (token: string) => {
    try {
      await api.post('/auth/2fa/enable', { token });
      await get().fetchProfile();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '2FA enable failed');
    }
  },

  disable2FA: async (token: string) => {
    try {
      await api.post('/auth/2fa/disable', { token });
      await get().fetchProfile();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '2FA disable failed');
    }
  },
}));
