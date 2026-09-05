'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMomentsStore } from '@/store/momentsStore';
import { useAuthStore } from '@/store/authStore';

interface Moment {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  thumbnailUrl?: string;
  caption?: string;
  durationSeconds?: number;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  expiresAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  hasViewed?: boolean;
  hasLiked?: boolean;
}

interface StoryViewerProps {
  moments: Moment[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoryViewer({ moments, initialIndex, onClose }: StoryViewerProps) {
  const { user } = useAuthStore();
  const { viewMoment, likeMoment, deleteMoment } = useMomentsStore();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(moments[initialIndex]?.hasLiked || false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const currentMoment = moments[currentIndex];

  const DURATION = currentMoment?.mediaType === 'video'
    ? (currentMoment.durationSeconds || 15) * 1000
    : 5000;

  useEffect(() => {
    if (!currentMoment) return;

    if (!currentMoment.hasViewed && currentMoment.userId !== user?.id) {
      viewMoment(currentMoment.id);
    }

    setProgress(0);
    setIsLiked(currentMoment.hasLiked || false);

    if (!isPaused) {
      startProgress();
    }

    return () => {
      stopProgress();
    };
  }, [currentIndex, currentMoment?.id]);

  const startProgress = useCallback(() => {
    stopProgress();

    const startTime = Date.now();
    const startProgress = progress;

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(100, startProgress + (elapsed / DURATION) * 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        stopProgress();
        goToNext();
      }
    }, 50);
  }, [currentIndex, DURATION, isPaused]);

  const stopProgress = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < moments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  }, [currentIndex, moments.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsPaused(true);
    stopProgress();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    setTouchStart(null);
    setIsPaused(false);
    startProgress();
  };

  const handleMouseDown = () => {
    setIsPaused(true);
    stopProgress();
  };

  const handleMouseUp = () => {
    setIsPaused(false);
    startProgress();
  };

  const handleLike = async () => {
    const result = await likeMoment(currentMoment.id);
    setIsLiked(result);
  };

  const handleDelete = async () => {
    if (confirm('Delete this moment?')) {
      await deleteMoment(currentMoment.id);
      if (moments.length === 1) {
        onClose();
      } else {
        goToNext();
      }
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!currentMoment) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 p-2 flex gap-1">
          {moments.map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-4 left-0 right-0 z-10 flex items-center gap-3 px-4">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
            {currentMoment.user?.avatarUrl ? (
              <img src={currentMoment.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (currentMoment.user?.displayName || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{currentMoment.user?.displayName || 'Unknown'}</p>
            <p className="text-white/60 text-xs">{timeAgo(currentMoment.createdAt)}</p>
          </div>
          {currentMoment.userId === user?.id && (
            <button
              onClick={handleDelete}
              className="text-white/60 hover:text-red-400 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-gray-900 cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          <div className="absolute inset-0 flex">
            <div className="w-1/3 cursor-pointer" onClick={goToPrev} />
            <div className="w-1/3" />
            <div className="w-1/3 cursor-pointer" onClick={goToNext} />
          </div>

          {currentMoment.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentMoment.mediaUrl}
              className="max-w-full max-h-full object-contain"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <img
              src={currentMoment.mediaUrl}
              alt={currentMoment.caption || 'Moment'}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>

        {currentMoment.caption && (
          <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm">{currentMoment.caption}</p>
          </div>
        )}

        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition ${
                isLiked ? 'text-red-500' : 'text-white/80 hover:text-white'
              }`}
            >
              <svg className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm">{currentMoment.likeCount + (isLiked ? 1 : 0)}</span>
            </button>

            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-white/80 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm">{currentMoment.replyCount}</span>
            </button>

            <span className="flex items-center gap-1 text-white/60 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {currentMoment.viewCount}
            </span>
          </div>
        </div>
      </div>

      {showReplies && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply..."
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              maxLength={500}
            />
            <button
              onClick={() => {
                if (replyText.trim()) {
                }
                setReplyText('');
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
