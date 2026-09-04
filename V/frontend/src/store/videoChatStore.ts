'use client';

import { create } from 'zustand';
import { WebRTCService, ConnectionState, ConnectionStats } from '@/lib/webrtc';

type MatchStatus = 'idle' | 'searching' | 'connecting' | 'connected' | 'extending' | 'ended' | 'error';

interface MatchedUser {
  id: string;
  displayName: string;
  age: number;
  gender: string;
  avatarUrl?: string;
  isPremium?: boolean;
}

interface ChatState {
  webrtc: WebRTCService | null;
  matchStatus: MatchStatus;
  sessionId: string | null;
  matchedUser: MatchedUser | null;
  timeRemaining: number;
  isExtended: boolean;
  extendRequested: boolean;
  otherUserRequestedExtend: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  connectionStats: ConnectionStats | null;
  error: string | null;
  totalMatches: number;
  currentMatchTime: number;

  initialize: () => Promise<void>;
  startMatching: (preferences: MatchPreferences) => void;
  stopMatching: () => void;
  handleMatchFound: (sessionId: string, user: MatchedUser) => Promise<void>;
  startSession: () => void;
  nextMatch: () => void;
  requestExtend: () => void;
  acceptExtend: () => void;
  declineExtend: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
  endSession: () => void;
  setError: (error: string) => void;
  cleanup: () => void;
}

interface MatchPreferences {
  ageMin: number;
  ageMax: number;
  genders: string[];
  languages: string[];
}

const TIMER_DURATION = 15;

export const useChatStore = create<ChatState>((set, get) => ({
  webrtc: null,
  matchStatus: 'idle',
  sessionId: null,
  matchedUser: null,
  timeRemaining: TIMER_DURATION,
  isExtended: false,
  extendRequested: false,
  otherUserRequestedExtend: false,
  isMuted: false,
  isCameraOff: false,
  localStream: null,
  remoteStream: null,
  connectionState: 'new',
  connectionStats: null,
  error: null,
  totalMatches: 0,
  currentMatchTime: 0,

  initialize: async () => {
    try {
      const webrtc = new WebRTCService();

      webrtc.onConnectionStateChange = (state) => {
        set({ connectionState: state });
        if (state === 'failed') {
          set({ error: 'Connection failed. Finding new match...', matchStatus: 'error' });
          setTimeout(() => get().nextMatch(), 2000);
        }
      };

      webrtc.onRemoteStream = (stream) => {
        set({ remoteStream: stream });
      };

      webrtc.onError = (error) => {
        set({ error: error.message });
      };

      webrtc.onStatsUpdate = (stats) => {
        set({ connectionStats: stats });
      };

      const localStream = await webrtc.initializeLocalStream();
      await webrtc.createPeerConnection();

      set({
        webrtc,
        localStream,
        isMuted: false,
        isCameraOff: false,
        error: null,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to initialize camera/microphone' });
    }
  },

  startMatching: (preferences: MatchPreferences) => {
    const { webrtc } = get();
    if (webrtc) {
      webrtc.close();
    }
    set({
      matchStatus: 'searching',
      error: null,
      sessionId: null,
      matchedUser: null,
      timeRemaining: TIMER_DURATION,
      isExtended: false,
      extendRequested: false,
      otherUserRequestedExtend: false,
    });
  },

  stopMatching: () => {
    set({ matchStatus: 'idle' });
  },

  handleMatchFound: async (sessionId: string, user: MatchedUser) => {
    const currentState = get();
    set({
      matchStatus: 'connecting',
      sessionId,
      matchedUser: user,
      timeRemaining: TIMER_DURATION,
      isExtended: false,
      extendRequested: false,
      otherUserRequestedExtend: false,
      error: null,
      totalMatches: currentState.totalMatches + 1,
    });
  },

  startSession: () => {
    const { webrtc, sessionId } = get();
    if (!webrtc || !sessionId) return;

    set({
      matchStatus: 'connected',
      timeRemaining: TIMER_DURATION,
      currentMatchTime: 0,
    });

    const timer = setInterval(() => {
      const state = get();
      if (state.matchStatus !== 'connected' && state.matchStatus !== 'extending') {
        clearInterval(timer);
        return;
      }

      const newTime = state.timeRemaining - 1;
      set({
        timeRemaining: newTime,
        currentMatchTime: state.currentMatchTime + 1,
      });

      if (newTime <= 0) {
        clearInterval(timer);
        if (!state.isExtended) {
          get().endSession();
        }
      }
    }, 1000);
  },

  nextMatch: () => {
    const { webrtc, sessionId } = get();

    if (sessionId) {
    }

    if (webrtc) {
      webrtc.close();
    }

    set({
      matchStatus: 'searching',
      sessionId: null,
      matchedUser: null,
      timeRemaining: TIMER_DURATION,
      isExtended: false,
      extendRequested: false,
      otherUserRequestedExtend: false,
      remoteStream: null,
      error: null,
      connectionState: 'new',
      connectionStats: null,
    });

    setTimeout(async () => {
      const state = get();
      if (state.webrtc) {
        state.webrtc.close();
      }
      await state.initialize();
    }, 500);
  },

  requestExtend: () => {
    set({ extendRequested: true });
  },

  acceptExtend: () => {
    const { timeRemaining, extendRequested } = get();

    if (timeRemaining <= 0 && extendRequested) {
      set({
        isExtended: true,
        timeRemaining: TIMER_DURATION,
        extendRequested: false,
        otherUserRequestedExtend: false,
        matchStatus: 'extending',
      });

      setTimeout(() => {
        set({ matchStatus: 'connected' });
      }, 1000);
    } else if (timeRemaining > 0) {
      set({
        isExtended: true,
        timeRemaining: timeRemaining + TIMER_DURATION,
        extendRequested: false,
        otherUserRequestedExtend: false,
      });
    }
  },

  declineExtend: () => {
    set({
      extendRequested: false,
      otherUserRequestedExtend: false,
    });
  },

  toggleMute: () => {
    const { webrtc, isMuted } = get();
    if (!webrtc) return;

    if (isMuted) {
      webrtc.unmuteAudio();
    } else {
      webrtc.muteAudio();
    }
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { webrtc, isCameraOff } = get();
    if (!webrtc) return;

    webrtc.toggleCamera();
    set({ isCameraOff: !isCameraOff });
  },

  switchCamera: async () => {
    const { webrtc } = get();
    if (!webrtc) return;

    try {
      await webrtc.switchCamera();
    } catch (error: any) {
      set({ error: error.message || 'Failed to switch camera' });
    }
  },

  endSession: () => {
    const { webrtc } = get();
    if (webrtc) {
      webrtc.close();
    }

    set({
      matchStatus: 'ended',
      remoteStream: null,
      connectionState: 'closed',
    });

    setTimeout(() => {
      get().nextMatch();
    }, 2000);
  },

  setError: (error: string) => {
    set({ error });
  },

  cleanup: () => {
    const { webrtc } = get();
    if (webrtc) {
      webrtc.close();
    }
    set({
      webrtc: null,
      matchStatus: 'idle',
      localStream: null,
      remoteStream: null,
      connectionState: 'new',
    });
  },
}));
