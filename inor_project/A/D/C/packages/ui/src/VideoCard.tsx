'use client';
import { useState } from 'react';
import { cn, formatDuration, formatViews, timeAgo } from '@yt/shared';
import { ChannelAvatar } from './ChannelAvatar';
import { MoreHorizontal } from 'lucide-react';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    previewGifUrl?: string | null;
    duration: number;
    views: string;
    createdAt: string;
    channel?: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      isVerified?: boolean;
    };
  };
  layout?: 'grid' | 'list' | 'mini';
  className?: string;
}

export function VideoCard({ video, layout = 'grid', className }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (layout === 'mini') {
    return (
      <div className={cn('flex gap-2 group cursor-pointer', className)}>
        <div className="relative shrink-0">
          <div className="w-40 aspect-video rounded-lg bg-[#272727] overflow-hidden">
            {video.thumbnailUrl && (
              <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white line-clamp-2">{video.title}</h4>
          <p className="text-xs text-gray-400 mt-1">{video.channel?.name}</p>
          <p className="text-xs text-gray-400">
            {formatViews(video.views)} views &bull; {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className={cn('flex gap-4 group cursor-pointer', className)}>
        <div
          className="relative shrink-0"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="w-60 aspect-video rounded-xl bg-[#272727] overflow-hidden">
            {isHovered && video.previewGifUrl ? (
              <img src={video.previewGifUrl} alt="" className="w-full h-full object-cover" />
            ) : video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1 rounded">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-white line-clamp-2">{video.title}</h3>
          <p className="text-sm text-gray-400 mt-1">
            {formatViews(video.views)} views &bull; {timeAgo(video.createdAt)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <ChannelAvatar src={video.channel?.avatarUrl} alt={video.channel?.name} size="sm" />
            <span className="text-sm text-gray-400">{video.channel?.name}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('group cursor-pointer', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative mb-3">
        <div className="aspect-video rounded-xl bg-[#272727] overflow-hidden">
          {(isHovered && video.previewGifUrl) ? (
            <img src={video.previewGifUrl} alt="" className="w-full h-full object-cover" />
          ) : video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded font-medium">
          {formatDuration(video.duration)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full hidden group-hover:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="text-white" size={18} />
        </button>
      </div>
      <div className="flex gap-3">
        <ChannelAvatar
          src={video.channel?.avatarUrl}
          alt={video.channel?.name}
          size="sm"
          isVerified={video.channel?.isVerified}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white line-clamp-2 leading-5">{video.title}</h3>
          <p className="text-sm text-gray-400 mt-0.5 hover:text-gray-300">{video.channel?.name}</p>
          <p className="text-sm text-gray-400">
            {formatViews(video.views)} views &bull; {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
