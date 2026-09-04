'use client';
import { useState, useEffect } from 'react';
import { VideoCard, VideoCardSkeleton, ChipBar } from '@yt/ui';
import { api } from '@/lib/api';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'unwatched', label: 'Unwatched' },
  { id: 'live', label: 'Live' },
];

export default function SubscriptionsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const params = filter !== 'all' ? { filter } : {};
        const res = await api.get<{ success: boolean; data: any[] }>('/feed/subscriptions', params);
        if (res.success) setVideos(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [filter]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Subscriptions</h1>
        <button className="text-sm text-blue-400 hover:text-blue-300">Manage</button>
      </div>

      <ChipBar chips={filters} selectedId={filter} onSelect={setFilter} className="mb-4" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">Subscribe to channels to see their latest videos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video: any) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
