'use client';
import { useState, useEffect } from 'react';
import { formatViews, timeAgo } from '@yt/shared';
import { Skeleton, Button } from '@yt/ui';
import { api } from '@/lib/api';

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>('/admin/videos', { params: { limit: 50 } }).then((res) => {
      if (res.success) setVideos(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Videos</h1>

      <div className="bg-yt-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-yt-border">
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Video</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Channel</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Status</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Views</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Likes</th>
              <th className="text-left p-3 text-xs text-gray-400 font-medium">Uploaded</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-b border-yt-border hover:bg-yt-hover">
                <td className="p-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-20 aspect-video rounded bg-yt-bg overflow-hidden shrink-0">
                      {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-sm text-white line-clamp-2">{video.title}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-400">{video.channel?.name || '-'}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${video.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' : video.status === 'PROCESSING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{video.status}</span></td>
                <td className="p-3 text-sm text-gray-400">{formatViews(Number(video.views))}</td>
                <td className="p-3 text-sm text-gray-400">{video.likes || 0}</td>
                <td className="p-3 text-sm text-gray-400">{timeAgo(video.createdAt)}</td>
                <td className="p-3">
                  <Button variant="ghost" size="sm">Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
