'use client';
import { useState, useEffect } from 'react';
import { formatViews } from '@yt/shared';
import { Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const viewsData = [
  { date: 'Mon', views: 1200 }, { date: 'Tue', views: 1800 }, { date: 'Wed', views: 900 },
  { date: 'Thu', views: 2400 }, { date: 'Fri', views: 3100 }, { date: 'Sat', views: 2800 },
  { date: 'Sun', views: 2100 },
];

const demoData = [
  { age: '18-24', male: 45, female: 30 },
  { age: '25-34', male: 60, female: 50 },
  { age: '35-44', male: 35, female: 40 },
  { age: '45-54', male: 20, female: 25 },
  { age: '55+', male: 10, female: 15 },
];

const trafficSources = [
  { source: 'YouTube search', value: 40 },
  { source: 'Suggested videos', value: 25 },
  { source: 'Direct', value: 15 },
  { source: 'External', value: 12 },
  { source: 'Playlists', value: 8 },
];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('28');

  useEffect(() => {
    api.get<{ success: boolean; data: any }>(`/analytics/overview?period=${period}`).then((res) => {
      if (res.success) setOverview(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Analytics</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            {['7', '28', '90', 'lifetime'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  period === p ? 'bg-yt-hover text-white' : 'text-gray-400 hover:bg-yt-hover'
                }`}
              >
                {p === 'lifetime' ? 'Lifetime' : `Last ${p} days`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-yt-surface rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Views</p>
              <p className="text-2xl font-bold text-white">{formatViews(Number(overview?.totalViews) || 0)}</p>
              {overview?.viewChange && <p className={`text-xs mt-1 ${overview.viewChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>{overview.viewChange >= 0 ? '+' : ''}{overview.viewChange}%</p>}
            </div>
            <div className="bg-yt-surface rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Watch time (hours)</p>
              <p className="text-2xl font-bold text-white">{overview?.totalWatchTime || 0}</p>
            </div>
            <div className="bg-yt-surface rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Subscribers</p>
              <p className="text-2xl font-bold text-white">{overview?.subscribers || 0}</p>
            </div>
            <div className="bg-yt-surface rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Videos</p>
              <p className="text-2xl font-bold text-white">{overview?.totalVideos || 0}</p>
            </div>
          </div>

          <div className="bg-yt-surface rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-white mb-4">Views over time</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={viewsData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="url(#colorViews)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-yt-surface rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4">Traffic source</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trafficSources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#666" fontSize={12} />
                  <YAxis dataKey="source" type="category" stroke="#666" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-yt-surface rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4">Demographics</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={demoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="age" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="male" fill="#3b82f6" name="Male" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="female" fill="#ec4899" name="Female" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-yt-surface rounded-xl p-6">
            <h2 className="text-lg font-medium text-white mb-4">Real-time activity</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={Array.from({ length: 24 }).map((_, i) => ({ hour: `${i}:00`, viewers: Math.floor(Math.random() * 50) + 5 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hour" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="viewers" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
