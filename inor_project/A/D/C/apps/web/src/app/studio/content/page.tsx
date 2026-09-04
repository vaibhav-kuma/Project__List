'use client';
import { useState, useEffect } from 'react';
import { formatViews, timeAgo, formatDuration } from '@yt/shared';
import { Button, Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Edit3, BarChart3, MessageCircle, Trash2, Eye, Lock, Globe } from 'lucide-react';

export default function StudioContentPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>('/videos', { params: { limit: 50 } }).then((res) => {
      if (res.success) setVideos(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const visibilityIcon = (status: string) => {
    switch (status) {
      case 'PUBLIC': return <Globe size={14} className="text-green-400" />;
      case 'UNLISTED': return <Eye size={14} className="text-yellow-400" />;
      case 'PRIVATE': return <Lock size={14} className="text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Video content</h1>
        <Button variant="primary" onClick={() => window.location.href = '/studio/upload'}>Upload</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4"><Skeleton className="w-32 aspect-video rounded-lg" /><div className="flex-1"><Skeleton className="h-4 w-48 mb-2" /><Skeleton className="h-3 w-32" /></div></div>
          ))}
        </div>
      ) : (
        <div className="bg-yt-surface rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-yt-border">
                <th className="text-left p-3 text-xs text-gray-400 font-medium">Video</th>
                <th className="text-left p-3 text-xs text-gray-400 font-medium">Visibility</th>
                <th className="text-left p-3 text-xs text-gray-400 font-medium">Date</th>
                <th className="text-left p-3 text-xs text-gray-400 font-medium">Views</th>
                <th className="text-left p-3 text-xs text-gray-400 font-medium">Comments</th>
                <th className="text-left p-3 text-xs text-gray-400 font-medium">Likes</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id} className="border-b border-yt-border hover:bg-yt-hover transition-colors">
                  <td className="p-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-32 aspect-video rounded bg-yt-bg overflow-hidden shrink-0">
                        {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white line-clamp-2">{video.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(video.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {visibilityIcon(video.status)}
                      <span className="text-xs text-gray-400">{video.status?.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-gray-400">{video.publishedAt ? timeAgo(video.publishedAt) : '-'}</td>
                  <td className="p-3 text-xs text-gray-400">{formatViews(Number(video.views))}</td>
                  <td className="p-3 text-xs text-gray-400">-</td>
                  <td className="p-3 text-xs text-gray-400">{video.likes || 0}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-yt-bg rounded-full"><Edit3 size={14} className="text-gray-400" /></button>
                      <button className="p-1.5 hover:bg-yt-bg rounded-full"><BarChart3 size={14} className="text-gray-400" /></button>
                      <button className="p-1.5 hover:bg-yt-bg rounded-full"><MessageCircle size={14} className="text-gray-400" /></button>
                      <button className="p-1.5 hover:bg-yt-bg rounded-full"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
