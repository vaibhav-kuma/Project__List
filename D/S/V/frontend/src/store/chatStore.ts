import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

type ChatStatus = 'idle' | 'waiting' | 'connecting' | 'active' | 'extended' | 'ended';

interface ChatState {
  socket: Socket | null;
  status: ChatStatus;
  sessionId: string | null;
  matchedWith: string | null;
  duration: number;
  isExtended: boolean;
  showReport: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  joinQueue: (token: string, preferences: any) => void;
  leaveQueue: () => void;
  endSession: (sessionId: string) => void;
  requestExtend: (sessionId: string) => void;
  reportSession: (sessionId: string, reason: string) => void;
  setShowReport: (show: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  reset: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  status: 'idle',
  sessionId: null,
  matchedWith: null,
  duration: 15,
  isExtended: false,
  showReport: false,
  localStream: null,
  remoteStream: null,

  joinQueue: async (token: string, preferences: any) => {
    const socket = io(API_URL, { auth: { token } });

    socket.on('connect', () => {
      console.log('Socket connected');
      set({ socket, status: 'waiting' });
    });

    socket.on('match_found', ({ sessionId, matchedWith }) => {
      set({ sessionId, matchedWith, status: 'connecting' });
    });

    socket.on('session_started', ({ sessionId, duration }) => {
      set({ sessionId, duration, status: 'active', isExtended: false });
    });

    socket.on('session_extended', ({ sessionId }) => {
      set({ status: 'extended', isExtended: true });
    });

    socket.on('extend_requested', ({ sessionId, requestedBy }) => {
      console.log(`${requestedBy} wants to extend`);
    });

    socket.on('session_ended', ({ sessionId, duration }) => {
      set({ status: 'ended', duration });
      setTimeout(() => {
        get().reset();
        socket.emit('join_queue', {
          ageRangeMin: 18,
          ageRangeMax: 99,
          preferredGender: [],
        });
      }, 2000);
    });

    socket.on('webrtc_signal', ({ signal, fromUserId }) => {
      console.log('Received WebRTC signal from', fromUserId);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    set({ socket });
  },

  leaveQueue: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave_queue');
      socket.disconnect();
      set({ socket: null, status: 'idle' });
    }
  },

  endSession: (sessionId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('end_session', { sessionId });
    }
  },

  requestExtend: (sessionId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('request_extend', { sessionId });
    }
  },

  reportSession: (sessionId: string, reason: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('report_session', { sessionId, reason });
    }
  },

  setShowReport: (show: boolean) => {
    set({ showReport: show });
  },

  setLocalStream: (stream: MediaStream | null) => {
    set({ localStream: stream });
  },

  setRemoteStream: (stream: MediaStream | null) => {
    set({ remoteStream: stream });
  },

  reset: () => {
    set({
      sessionId: null,
      matchedWith: null,
      duration: 15,
      isExtended: false,
      status: 'waiting',
    });
  },
}));
