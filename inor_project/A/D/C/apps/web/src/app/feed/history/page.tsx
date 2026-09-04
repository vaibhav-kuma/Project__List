'use client';
import { useState, useEffect } from 'react';
import { formatViews, timeAgo, formatDuration } from '@yt/shared';
import { Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { History, X, Search } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>('/me/history');
        if (res.success) setHistory(res.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const removeItem = async (videoId: string) => {
    try {
      await api.delete(`/me/history/${videoId}`);
      setHistory((prev) => prev.filter((h) => h.videoId !== videoId));
    } catch {}
  };

  return (
    <div className="flex gap-4 p-4 max-w-[1400px] mx-auto">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History size={24} className="text-white" />
            <h1 className="text-xl font-bold text-white">History</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search history"
                className="bg-yt-surface border border-yt-border rounded-full pl-9 pr-4 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3"><Skeleton className="w-40 aspect-video rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item: any) => (
              <div key={item.id} className="flex gap-3 group cursor-pointer hover:bg-yt-hover p-2 rounded-lg transition-colors">
                <div className="relative shrink-0">
                  <div className="w-40 aspect-video rounded-lg bg-yt-surface overflow-hidden">
                    {item.video?.thumbnailUrl && <img src={item.video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white line-clamp-2">{item.video?.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">Watched {timeAgo(item.watchedAt)}</p>
                </div>
                <button onClick={() => removeItem(item.videoId)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-yt-hover rounded-full self-start transition-opacity">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-72 hidden lg:block shrink-0">
        <div className="bg-yt-surface rounded-xl p-4 space-y-3">
          <button className="w-full text-sm text-blue-400 hover:text-blue-300 text-left">Clear all watch history</button>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Pause watch history</span>
            <div className="w-8 h-4 bg-yt-hover rounded-full relative cursor-pointer">
              <div className="w-3 h-3 bg-gray-500 rounded-full absolute top-0.5 left-0.5" />
            </div>
          </div>
          <button className="w-full text-sm text-blue-400 hover:text-blue-300 text-left">Manage all history</button>
        </div>
      </div>
    </div>
  );
}
