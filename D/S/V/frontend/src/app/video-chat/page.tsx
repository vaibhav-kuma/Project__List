'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatSocket } from '@/store/chatSocket';
import { useWebRTCChat } from '@/hooks/useWebRTCChat';
import VideoControls from '@/components/chat/VideoControls';
import MatchOverlay from '@/components/chat/MatchOverlay';
import SessionTimer from '@/components/chat/SessionTimer';
import ExtendPrompt from '@/components/chat/ExtendPrompt';
import ConnectionQuality from '@/components/chat/ConnectionQuality';
import VideoFilters from '@/components/chat/VideoFilters';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

export default function VideoChatPage() {
  const { user, token, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const {
    socket,
    connect,
    disconnect,
    joinQueue,
    leaveQueue,
    requestExtend,
    acceptExtend,
    endSession,
    matchStatus,
    sessionId,
    matchedUser,
    extendRequested,
    otherUserRequestedExtend,
    queuePosition,
    totalMatches,
    error: socketError,
  } = useChatSocket();

  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    connectionState,
    connectionStats,
    isMuted,
    isCameraOff,
    error: webrtcError,
    initialize,
    connectToPeer,
    toggleMute,
    toggleCamera,
    switchCamera,
    cleanup,
  } = useWebRTCChat();

  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isExtended, setIsExtended] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [showFilters, setShowFilters] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const error = socketError || webrtcError;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && token) {
      connect(token);
      initialize();
    }

    return () => {
      disconnect();
      cleanup();
    };
  }, [user, token]);

  useEffect(() => {
    if (socket && matchStatus === 'idle') {
      joinQueue({
        ageMin: 18,
        ageMax: 99,
        genders: [],
        languages: ['en'],
      });
    }
  }, [socket, matchStatus]);

  useEffect(() => {
    if (matchStatus === 'connecting' && sessionId) {
      const isInitiator = matchedUser && user && matchedUser.id > user.id;
      connectToPeer(sessionId, isInitiator || false);
    }
  }, [matchStatus, sessionId]);

  useEffect(() => {
    if (matchStatus === 'connected') {
      setTimeRemaining(15);
      setIsExtended(false);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [matchStatus, sessionId]);

  useEffect(() => {
    if (timeRemaining === 0 && matchStatus === 'connected' && !isExtended) {
      endSession();
    }
  }, [timeRemaining, matchStatus, isExtended]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  const handleNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    endSession();
  }, [endSession]);

  const handleExtend = useCallback(() => {
    requestExtend();
  }, [requestExtend]);

  const handleAcceptExtend = useCallback(() => {
    acceptExtend();
    setIsExtended(true);
    setTimeRemaining(15);
  }, [acceptExtend]);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setShowFilters(false);

    if (localVideoRef.current) {
      const filterMap: Record<string, string> = {
        none: '',
        beauty: 'blur(1px) saturate(1.2) brightness(1.15) contrast(1.05)',
        blur: 'blur(3px)',
        warm: 'saturate(1.5) brightness(1.1)',
        cool: 'saturate(0.8) hue-rotate(180deg)',
        grayscale: 'grayscale(100%)',
        sepia: 'sepia(100%)',
        vintage: 'sepia(50%) contrast(1.1) brightness(0.9)',
        dramatic: 'contrast(1.5) brightness(0.8) saturate(0.7)',
        neon: 'saturate(2) hue-rotate(90deg) brightness(1.2)',
      };
      localVideoRef.current.style.filter = filterMap[filter] || '';
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-900 relative overflow-hidden">
      <div className="relative w-full h-screen">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900" />
        )}

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 w-32 h-24 sm:w-40 sm:h-30 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-gray-800 transition-all"
          style={{ transform: 'scaleX(-1)' }}
        />

        {matchStatus === 'connected' && matchedUser && (
          <>
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white font-medium flex items-center gap-1">
                  {matchedUser.displayName}
                  {matchedUser.isPremium && <PremiumBadge />}
                </p>
                <p className="text-white/60 text-xs">
                  {matchedUser.age} • {matchedUser.gender}
                </p>
              </div>

              <div className="flex gap-2">
                <ConnectionQuality stats={connectionStats} />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-black/70 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <SessionTimer
                timeRemaining={timeRemaining}
                isExtended={isExtended}
              />
            </div>
          </>
        )}

        {matchStatus === 'searching' && <MatchOverlay totalMatches={totalMatches} />}

        {matchStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white text-xl">Connecting...</p>
              <p className="text-white/60 text-sm mt-2">Setting up video connection</p>
            </div>
          </div>
        )}

        {matchStatus === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Finding next match...</p>
            </div>
          </div>
        )}

        {showFilters && matchStatus === 'connected' && (
          <VideoFilters
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        )}

        {(matchStatus === 'connected' || matchStatus === 'extending') && (
          <div className="absolute bottom-0 left-0 right-0">
            <VideoControls
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              onToggleMute={toggleMute}
              onToggleCamera={toggleCamera}
              onSwitchCamera={switchCamera}
              onNext={handleNext}
              onExtend={handleExtend}
              onEnd={handleNext}
              extendRequested={extendRequested}
              otherUserRequested={otherUserRequestedExtend}
              timeRemaining={timeRemaining}
            />
          </div>
        )}

        {matchStatus === 'connected' && otherUserRequestedExtend && !extendRequested && (
          <ExtendPrompt
            onAccept={handleAcceptExtend}
            onDecline={() => {}}
            userName={matchedUser?.displayName || 'User'}
          />
        )}

        {error && matchStatus !== 'idle' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {matchStatus === 'searching' && queuePosition > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm">
            Queue position: {queuePosition}
          </div>
        )}
      </div>
    </main>
  );
}
