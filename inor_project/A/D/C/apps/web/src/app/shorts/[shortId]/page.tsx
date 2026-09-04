'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatViews } from '@yt/shared';
import { ChannelAvatar, Button } from '@yt/ui';
import { api } from '@/lib/api';
import {
  ThumbsUp, ThumbsDown, MessageCircle, Share2, Music,
} from 'lucide-react';

export default function ShortsPage() {
  const { shortId } = useParams();
  const [short, setShort] = useState<any>(null);

  useEffect(() => {
    if (!shortId) return;
    api.get<{ success: boolean; data: any }>(`/shorts/${shortId}`).then((res) => {
      if (res.success) setShort(res.data);
    }).catch(console.error);
  }, [shortId]);

  return (
    <div className="h-[calc(100vh-56px)] bg-black flex items-center justify-center">
      <div className="relative h-full max-w-[420px] w-full bg-yt-surface flex items-center justify-center">
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {short && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <ChannelAvatar src={short.channel?.avatarUrl} alt={short.channel?.name} size="md" />
                <span className="text-sm font-medium text-white flex-1">{short.channel?.name}</span>
                <Button variant="primary" size="sm">Subscribe</Button>
              </div>
              <p className="text-sm text-white mb-2">{short.title}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Music size={14} />
                <span>Original Sound</span>
              </div>
            </>
          )}
        </div>

        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-3">
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-yt-surface/80 flex items-center justify-center">
              <ThumbsUp size={20} className="text-white" />
            </div>
            <span className="text-xs text-white">{short ? formatViews(Number(short.views)) : '0'}</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-yt-surface/80 flex items-center justify-center">
              <ThumbsDown size={20} className="text-white" />
            </div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-yt-surface/80 flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <span className="text-xs text-white">Comments</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-yt-surface/80 flex items-center justify-center">
              <Share2 size={20} className="text-white" />
            </div>
            <span className="text-xs text-white">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
