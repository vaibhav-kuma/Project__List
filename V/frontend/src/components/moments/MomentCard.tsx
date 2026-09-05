'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMomentsStore } from '@/store/momentsStore';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

interface Moment {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  thumbnailUrl?: string;
  caption?: string;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isPremium?: boolean;
  };
  hasViewed?: boolean;
  hasLiked?: boolean;
}

interface MomentCardProps {
  moment: Moment;
}

export default function MomentCard({ moment }: MomentCardProps) {
  const { user } = useAuthStore();
  const { viewMoment, likeMoment, deleteMoment } = useMomentsStore();
  const [liked, setLiked] = useState(moment.hasLiked || false);

  const handleView = async () => {
    if (moment.userId !== user?.id) {
      await viewMoment(moment.id);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await likeMoment(moment.id);
    setLiked(result);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this moment?')) {
      await deleteMoment(moment.id);
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isOwner = moment.userId === user?.id;

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
          !moment.hasViewed && !isOwner ? 'ring-2 ring-primary-500' : 'bg-gray-700'
        }`}>
          {moment.user?.avatarUrl ? (
            <img src={moment.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            (moment.user?.displayName || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-medium flex items-center gap-1">
            {moment.user?.displayName || 'Unknown'}
            {moment.user?.isPremium && <PremiumBadge />}
          </p>
          <p className="text-gray-400 text-xs">{timeAgo(moment.createdAt)}</p>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-400 transition p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="relative cursor-pointer" onClick={handleView}>
        {moment.mediaType === 'video' ? (
          <video
            src={moment.thumbnailUrl || moment.mediaUrl}
            className="w-full aspect-video object-cover"
            preload="metadata"
          />
        ) : (
          <img
            src={moment.mediaUrl}
            alt={moment.caption || 'Moment'}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        )}

        {moment.mediaType === 'gif' && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            GIF
          </div>
        )}

        {!moment.hasViewed && !isOwner && (
          <div className="absolute top-2 left-2 w-3 h-3 bg-primary-500 rounded-full" />
        )}
      </div>

      {moment.caption && (
        <div className="p-4">
          <p className="text-white text-sm">{moment.caption}</p>
        </div>
      )}

      <div className="px-4 pb-4 flex items-center gap-4 text-gray-400 text-sm">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 transition ${
            liked ? 'text-red-500' : 'hover:text-red-400'
          }`}
        >
          <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {moment.likeCount + (liked ? 1 : 0)}
        </button>

        <span className="flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {moment.viewCount}
        </span>

        <span className="flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {moment.replyCount}
        </span>
      </div>
    </div>
  );
}
