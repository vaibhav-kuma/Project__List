'use client';
import { useState, useEffect } from 'react';
import { formatViews } from '@yt/shared';
import { Button, Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Users, Eye, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

export default function StudioDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: any }>('/analytics/overview').then((res) => {
      if (res.success) setStats(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Channel Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-yt-surface rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Users size={20} className="text-blue-400" />
            <span className="flex items-center text-xs text-green-400 gap-1"><ArrowUp size={12} /> +2.5%</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.subscribers || 0}</p>
          <p className="text-sm text-gray-400">Subscribers</p>
        </div>

        <div className="bg-yt-surface rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Eye size={20} className="text-green-400" />
            <span className="flex items-center text-xs text-green-400 gap-1"><ArrowUp size={12} /> +12%</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatViews(Number(stats?.totalViews) || 0)}</p>
          <p className="text-sm text-gray-400">Views (28 days)</p>
        </div>

        <div className="bg-yt-surface rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock size={20} className="text-yellow-400" />
            <span className="flex items-center text-xs text-red-400 gap-1"><ArrowDown size={12} /> -5%</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.totalWatchTime || 0}h</p>
          <p className="text-sm text-gray-400">Watch time</p>
        </div>

        <div className="bg-yt-surface rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} className="text-purple-400" />
            <span className="flex items-center text-xs text-green-400 gap-1"><ArrowUp size={12} /> +8%</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.totalVideos || 0}</p>
          <p className="text-sm text-gray-400">Uploads</p>
        </div>
      </div>

      <div className="bg-yt-surface rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">Latest video performance</h2>
        <p className="text-sm text-gray-400">Upload a video to see its performance here</p>
        <div className="mt-4">
          <Button variant="primary" onClick={() => window.location.href = '/studio/upload'}>Upload video</Button>
        </div>
      </div>
    </div>
  );
}
