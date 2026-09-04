'use client';
import { useState, useEffect } from 'react';
import { Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Users, Video, Eye, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: any }>('/admin/stats').then((res) => {
      if (res.success) setStats(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-yt-surface rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3"><Users size={20} className="text-blue-400" /><p className="text-sm text-gray-400">Total Users</p></div>
            <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
          </div>
          <div className="bg-yt-surface rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3"><Video size={20} className="text-green-400" /><p className="text-sm text-gray-400">Total Videos</p></div>
            <p className="text-2xl font-bold text-white">{stats?.totalVideos || 0}</p>
          </div>
          <div className="bg-yt-surface rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3"><Eye size={20} className="text-yellow-400" /><p className="text-sm text-gray-400">Total Views</p></div>
            <p className="text-2xl font-bold text-white">{stats?.totalViews || '0'}</p>
          </div>
          <div className="bg-yt-surface rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3"><Activity size={20} className="text-purple-400" /><p className="text-sm text-gray-400">Active (24h)</p></div>
            <p className="text-2xl font-bold text-white">{stats?.activeUsers24h || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
