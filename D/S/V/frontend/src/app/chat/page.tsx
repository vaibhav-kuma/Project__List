'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import VideoChat from '@/components/chat/VideoChat';
import MatchQueue from '@/components/chat/MatchQueue';
import SessionTimer from '@/components/chat/SessionTimer';
import ExtendButton from '@/components/chat/ExtendButton';
import ReportModal from '@/components/chat/ReportModal';
import BottomNav from '@/components/ui/BottomNav';

export default function ChatPage() {
  const { user, token, loading } = useAuthStore();
  const {
    status,
    sessionId,
    matchedWith,
    duration,
    isExtended,
    showReport,
    joinQueue,
    leaveQueue,
    endSession,
    requestExtend,
    reportSession,
    setShowReport,
  } = useChatStore();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && token) {
      joinQueue(token, {
        ageRangeMin: 18,
        ageRangeMax: 99,
        preferredGender: [],
      });
    }

    return () => {
      leaveQueue();
    };
  }, [user, token]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">VideoChat</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300">{user.displayName}</span>
          <button
            onClick={() => router.push('/profile')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
          >
            Profile
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {status === 'waiting' && <MatchQueue />}

        {status === 'connecting' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Connecting...</p>
          </div>
        )}

        {(status === 'active' || status === 'extended') && matchedWith && (
          <div className="w-full max-w-4xl">
            <VideoChat videoRef={videoRef} />
            <div className="mt-4 flex justify-between items-center">
              <SessionTimer timeRemaining={duration} isExtended={isExtended} />
              <div className="flex gap-2">
                <ExtendButton onClick={() => requestExtend(sessionId!)} isExtended={isExtended} />
                <button
                  onClick={() => setShowReport(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Report
                </button>
                <button
                  onClick={() => endSession(sessionId!)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal
          reportedUserId={matchedWith!}
          sessionId={sessionId!}
          onClose={() => setShowReport(false)}
          onSuccess={() => setShowReport(false)}
        />
      )}

      <BottomNav />
    </main>
  );
}
