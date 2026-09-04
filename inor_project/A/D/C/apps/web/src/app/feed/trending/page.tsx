'use client';
import { useState, useEffect } from 'react';
import { formatViews, timeAgo, formatDuration } from '@yt/shared';
import { ChannelAvatar, Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Flame } from 'lucide-react';

const tabs = [
  { id: 'now', label: 'Now' },
  { id: 'music', label: 'Music' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'movies', label: 'Movies' },
];

export default function TrendingPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('now');

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: any[] }>('/feed/trending', { params: { category: tab, limit: 50 } });
        if (res.success) setVideos(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, [tab]);

  return (
    <div className="px-4 py-4 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Flame size={28} className="text-red-600" />
        <h1 className="text-xl font-bold text-white">Trending</h1>
      </div>

      <div className="flex gap-0 border-b border-yt-border mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id ? 'text-white border-white' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-yt-surface flex items-center justify-center text-gray-400 font-bold text-lg shrink-0">#{i + 1}</div>
              <Skeleton className="w-52 aspect-video rounded-xl" />
              <div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video: any, index: number) => (
            <div key={video.id} className="flex gap-4 items-start cursor-pointer hover:bg-yt-hover p-2 rounded-xl transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-gray-400">#{video.rank}</span>
              </div>
              <div className="relative shrink-0">
                <div className="w-52 aspect-video rounded-xl bg-yt-surface overflow-hidden">
                  {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1 rounded">{formatDuration(video.duration)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-medium text-white line-clamp-2">{video.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{video.channel?.name}</p>
                <p className="text-sm text-gray-400">
                  {formatViews(Number(video.views))} views &bull; {timeAgo(video.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
