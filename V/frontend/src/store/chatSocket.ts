import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

type MatchStatus = 'idle' | 'searching' | 'connecting' | 'connected' | 'extending' | 'ended' | 'error';

interface MatchedUser {
  id: string;
  displayName: string;
  age: number;
  gender: string;
  avatarUrl?: string;
  isPremium?: boolean;
}

interface SignalMessage {
  type: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ChatSocketState {
  socket: Socket | null;
  matchStatus: MatchStatus;
  sessionId: string | null;
  matchedUser: MatchedUser | null;
  extendRequested: boolean;
  otherUserRequestedExtend: boolean;
  error: string | null;
  queuePosition: number;
  totalMatches: number;
  onSignal: ((signal: any, fromUserId: string) => void) | null;
  setOnSignal: (handler: (signal: any, fromUserId: string) => void) => void;
  connect: (token: string) => void;
  disconnect: () => void;
  joinQueue: (preferences: any) => void;
  leaveQueue: () => void;
  sendSignal: (signal: SignalMessage, targetUserId: string) => void;
  requestExtend: () => void;
  acceptExtend: () => void;
  endSession: () => void;
  setError: (error: string) => void;
  setMatchStatus: (status: MatchStatus) => void;
  setMatchedUser: (user: MatchedUser) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useChatSocket = create<ChatSocketState>((set, get) => ({
  socket: null,
  matchStatus: 'idle',
  sessionId: null,
  matchedUser: null,
  extendRequested: false,
  otherUserRequestedExtend: false,
  error: null,
  queuePosition: 0,
  totalMatches: 0,
  onSignal: null,

  setOnSignal: (handler) => {
    set({ onSignal: handler });
  },

  connect: (token: string) => {
    const existing = get().socket;
    if (existing) existing.disconnect();

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ error: null });
    });

    socket.on('queue_joined', ({ position }) => {
      set({ matchStatus: 'searching', queuePosition: position });
    });

    socket.on('queue_left', () => {
      set({ matchStatus: 'idle', queuePosition: 0 });
    });

    socket.on('match_found', async ({ sessionId, matchedWith }) => {
      const currentState = get();
      set({
        sessionId,
        matchStatus: 'connecting',
        extendRequested: false,
        otherUserRequestedExtend: false,
        totalMatches: currentState.totalMatches + 1,
        matchedUser: { id: matchedWith, displayName: 'Stranger', age: 0, gender: 'unknown' },
      });

      try {
        const response = await fetch(`${API_URL}/api/users/${matchedWith}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          set({ matchedUser: data.user });
        }
      } catch {
      }
    });

    socket.on('session_started', () => {
      set({ matchStatus: 'connected' });
    });

    socket.on('session_extended', () => {
      set({ matchStatus: 'extending' });
      setTimeout(() => {
        set({ matchStatus: 'connected', extendRequested: false, otherUserRequestedExtend: false });
      }, 1000);
    });

    socket.on('extend_requested', () => {
      set({ otherUserRequestedExtend: true });
    });

    socket.on('extend_confirmed', () => {
      set({ extendRequested: false, otherUserRequestedExtend: false });
    });

    socket.on('session_ended', () => {
      set({
        matchStatus: 'ended',
        sessionId: null,
        matchedUser: null,
      });

      setTimeout(() => {
        const state = get();
        if (state.socket?.connected) {
          state.joinQueue({
            ageMin: 18,
            ageMax: 99,
            genders: [],
            languages: ['en'],
          });
        }
      }, 2000);
    });

    socket.on('webrtc_signal', ({ signal, fromUserId }) => {
      const handler = get().onSignal;
      if (handler) {
        handler(signal, fromUserId);
      }
    });

    socket.on('error', ({ message }) => {
      set({ error: message });
    });

    socket.on('connect_error', () => {
      set({ error: 'Connection failed. Please try again.' });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, matchStatus: 'idle' });
    }
  },

  joinQueue: (preferences: any) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('join_queue', preferences);
    }
  },

  leaveQueue: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave_queue');
    }
  },

  sendSignal: (signal: SignalMessage, targetUserId: string) => {
    const { socket, sessionId } = get();
    if (socket?.connected && sessionId) {
      socket.emit('webrtc_signal', {
        sessionId,
        signal,
        targetUserId,
      });
    }
  },

  requestExtend: () => {
    const { socket, sessionId } = get();
    if (socket?.connected && sessionId) {
      socket.emit('request_extend', { sessionId });
      set({ extendRequested: true });
    }
  },

  acceptExtend: () => {
    const { socket, sessionId } = get();
    if (socket?.connected && sessionId) {
      socket.emit('request_extend', { sessionId });
    }
  },

  endSession: () => {
    const { socket, sessionId } = get();
    if (socket?.connected && sessionId) {
      socket.emit('end_session', { sessionId });
    }
  },

  setError: (error: string) => {
    set({ error });
  },

  setMatchStatus: (status: MatchStatus) => {
    set({ matchStatus: status });
  },

  setMatchedUser: (user: MatchedUser) => {
    set({ matchedUser: user });
  },
}));
