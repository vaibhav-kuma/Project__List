import { create } from 'zustand';
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

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlySavings: number;
  trialDays: number;
  features: string[];
  popular?: boolean;
}

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  trialEndsAt?: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
}

export interface SubscriptionState {
  plans: Plan[];
  currentSubscription: Subscription | null;
  userStatus: {
    isPremium: boolean;
    premiumTier: string;
    premiumExpiresAt?: string;
  };
  features: any;
  trial: { isTrial: boolean; trialEndsAt?: string; daysRemaining: number };
  loading: boolean;
  error: string | null;

  fetchPlans: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
  createCheckoutSession: (data: { planId: string; interval: 'month' | 'year'; useTrial?: boolean; successUrl: string; cancelUrl: string }) => Promise<{ url: string }>;
  createBillingPortalSession: (returnUrl: string) => Promise<{ url: string }>;
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  updatePlan: (data: { newPlanId: string; interval: 'month' | 'year' }) => Promise<void>;
  checkFeatureAccess: (feature: string) => Promise<boolean>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plans: [],
  currentSubscription: null,
  userStatus: { isPremium: false, premiumTier: 'free' },
  features: null,
  trial: { isTrial: false, daysRemaining: 0 },
  loading: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/subscription/plans');
      set({ plans: data.plans, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch plans', loading: false });
    }
  },

  fetchCurrentSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/subscription/current');
      set({
        currentSubscription: data.subscription,
        userStatus: data.user,
        features: data.features,
        trial: data.trial,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch subscription', loading: false });
    }
  },

  createCheckoutSession: async (data) => {
    set({ loading: true, error: null });
    try {
      const { data: response } = await api.post('/subscription/checkout', data);
      set({ loading: false });
      return { url: response.url };
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create checkout', loading: false });
      throw error;
    }
  },

  createBillingPortalSession: async (returnUrl) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/subscription/billing-portal', { returnUrl });
      set({ loading: false });
      return { url: data.url };
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create billing session', loading: false });
      throw error;
    }
  },

  cancelSubscription: async (reason) => {
    set({ loading: true, error: null });
    try {
      await api.post('/subscription/cancel', { reason });
      await get().fetchCurrentSubscription();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to cancel subscription', loading: false });
    }
  },

  reactivateSubscription: async () => {
    set({ loading: true, error: null });
    try {
      await api.post('/subscription/reactivate');
      await get().fetchCurrentSubscription();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to reactivate', loading: false });
    }
  },

  updatePlan: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/subscription/update-plan', data);
      await get().fetchCurrentSubscription();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update plan', loading: false });
    }
  },

  checkFeatureAccess: async (feature) => {
    try {
      const { data } = await api.get(`/subscription/feature/${feature}`);
      return data.hasAccess;
    } catch {
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
