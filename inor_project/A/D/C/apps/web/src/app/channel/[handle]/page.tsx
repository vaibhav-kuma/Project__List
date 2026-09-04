'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatViews, timeAgo, formatDuration } from '@yt/shared';
import { ChannelAvatar, Button, VideoCard, Skeleton, ChipBar } from '@yt/ui';
import { api } from '@/lib/api';
import { MoreHorizontal, Share2, Bell } from 'lucide-react';

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'videos', label: 'Videos' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'live', label: 'Live' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'community', label: 'Community' },
  { id: 'about', label: 'About' },
];

export default function ChannelPage() {
  const { handle } = useParams();
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const fetchChannel = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: any }>(`/channels/${handle}`);
        if (res.success) {
          setChannel(res.data);
          const vids = await api.get<{ success: boolean; data: any[] }>(`/channels/${res.data.id}/videos`, { params: { limit: 12 } });
          if (vids.success) setVideos(vids.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (handle) fetchChannel();
  }, [handle]);

  if (loading) {
    return (
      <div className="p-4 max-w-[1400px] mx-auto">
        <Skeleton className="w-full h-48 md:h-64 rounded-xl mb-6" />
        <div className="flex items-center gap-6 px-4 -mt-16 mb-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
      </div>
    );
  }

  if (!channel) return <div className="p-8 text-center text-gray-400">Channel not found</div>;

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="h-48 md:h-64 bg-yt-surface rounded-xl mx-4 overflow-hidden relative">
        {channel.bannerUrl && (
          <img src={channel.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-4 px-6 -mt-16 mb-4">
        <ChannelAvatar src={channel.avatarUrl} alt={channel.name} size="xl" isVerified={channel.isVerified} />
        <div className="flex-1 mt-4 md:mt-0">
          <h1 className="text-2xl font-bold text-white">{channel.name}</h1>
          <p className="text-sm text-gray-400">{channel.handle}</p>
          <p className="text-sm text-gray-400">
            {formatViews(channel.subscriberCount)} subscribers &bull; {channel.videoCount} videos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="lg">Subscribe</Button>
          <Button variant="icon" size="icon" icon={<Bell size={20} />} />
          <Button variant="icon" size="icon" icon={<Share2 size={20} />} />
          <Button variant="icon" size="icon" icon={<MoreHorizontal size={20} />} />
        </div>
      </div>

      <div className="sticky top-14 z-20 bg-yt-bg border-b border-yt-border px-4">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-white'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video: any) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video: any) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
        {activeTab === 'about' && (
          <div className="max-w-2xl space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Description</h3>
              <p className="text-sm text-gray-200 mt-1">{channel.description || 'No description'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400">Stats</h3>
              <p className="text-sm text-gray-200 mt-1">
                Joined {timeAgo(channel.createdAt)} &bull; {formatViews(channel.totalViews || 0)} total views
              </p>
              {channel.country && <p className="text-sm text-gray-200">Country: {channel.country}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
