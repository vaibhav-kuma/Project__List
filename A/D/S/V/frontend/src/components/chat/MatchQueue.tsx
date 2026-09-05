'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';

export default function MatchQueue() {
  const [waitTime, setWaitTime] = useState(0);
  const { leaveQueue } = useChatStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      <div className="animate-pulse mb-8">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
          <svg
            className="w-16 h-16 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Finding someone...</h2>
      <p className="text-gray-400 mb-6">Waiting time: {formatTime(waitTime)}</p>

      <button
        onClick={leaveQueue}
        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition"
      >
        Cancel
      </button>
    </div>
  );
}
