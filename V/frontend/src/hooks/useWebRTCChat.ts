'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCService, ConnectionState, ConnectionStats } from '@/lib/webrtc';
import { useChatSocket } from '@/store/chatSocket';

interface UseWebRTCChatReturn {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  connectionStats: ConnectionStats | null;
  isMuted: boolean;
  isCameraOff: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  connectToPeer: (sessionId: string, isInitiator: boolean) => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
  cleanup: () => void;
}

export function useWebRTCChat(): UseWebRTCChatReturn {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('new');
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendSignal, setOnSignal } = useChatSocket();

  useEffect(() => {
    setOnSignal(handleIncomingSignal);

    return () => {
      setOnSignal(() => {});
    };
  }, []);

  const handleIncomingSignal = useCallback(async (signal: any, fromUserId: string) => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    try {
      if (signal.type === 'offer') {
        const answer = await webrtc.handleOffer(signal);
        sendSignal(answer as any, fromUserId);
      } else if (signal.type === 'answer') {
        await webrtc.handleAnswer(signal);

        for (const candidate of pendingCandidatesRef.current) {
          await webrtc.handleIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      } else if (signal.type === 'ice-candidate') {
        const state = webrtc.getConnectionState();
        if (state === 'connected' || state === 'connecting') {
          await webrtc.handleIceCandidate(signal.candidate);
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Signaling error');
    }
  }, [sendSignal]);

  const initialize = useCallback(async () => {
    try {
      setError(null);

      const webrtc = new WebRTCService();

      webrtc.onConnectionStateChange = (state) => {
        setConnectionState(state);
        if (state === 'failed') {
          setError('Connection failed. Finding new match...');
        }
      };

      webrtc.onRemoteStream = (stream) => {
        setRemoteStream(stream);
      };

      webrtc.onError = (err) => {
        setError(err.message);
      };

      webrtc.onStatsUpdate = (stats) => {
        setConnectionStats(stats);
      };

      webrtc.onSignal = (signal) => {
        const { matchedUser } = useChatSocket.getState();
        if (matchedUser) {
          sendSignal(signal as any, matchedUser.id);
        }
      };

      const stream = await webrtc.initializeLocalStream();
      await webrtc.createPeerConnection();

      webrtcRef.current = webrtc;
      setLocalStream(stream);
      setIsMuted(false);
      setIsCameraOff(false);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize camera/microphone');
    }
  }, [sendSignal]);

  const connectToPeer = useCallback(async (sessionId: string, isInitiator: boolean) => {
    isInitiatorRef.current = isInitiator;

    let webrtc = webrtcRef.current;
    if (!webrtc) {
      await initialize();
      webrtc = webrtcRef.current;
    }

    if (!webrtc) return;

    try {
      if (isInitiator) {
        const offer = await webrtc.createOffer();
        const { matchedUser } = useChatSocket.getState();
        if (matchedUser) {
          sendSignal(offer as any, matchedUser.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to establish connection');
    }
  }, [initialize, sendSignal]);

  const toggleMute = useCallback(() => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    if (isMuted) {
      webrtc.unmuteAudio();
    } else {
      webrtc.muteAudio();
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    webrtc.toggleCamera();
    setIsCameraOff(!isCameraOff);
  }, [isCameraOff]);

  const switchCamera = useCallback(async () => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    try {
      await webrtc.switchCamera();
    } catch (err: any) {
      setError(err.message || 'Failed to switch camera');
    }
  }, []);

  const cleanup = useCallback(() => {
    const webrtc = webrtcRef.current;
    if (webrtc) {
      webrtc.close();
      webrtcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('new');
    setConnectionStats(null);
    pendingCandidatesRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    connectionState,
    connectionStats,
    isMuted,
    isCameraOff,
    error,
    initialize,
    connectToPeer,
    toggleMute,
    toggleCamera,
    switchCamera,
    cleanup,
  };
}
