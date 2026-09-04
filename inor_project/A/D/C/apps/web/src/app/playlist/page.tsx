'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatViews, formatDuration, timeAgo } from '@yt/shared';
import { ChannelAvatar, Button, Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Play, Shuffle, Share2, MoreHorizontal, GripVertical } from 'lucide-react';

function PlaylistPageContent() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('list');

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playlistId) return;
    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: any }>(`/playlists/${playlistId}`);
        if (res.success) setPlaylist(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [playlistId]);

  if (!playlistId) return <div className="p-8 text-center text-gray-400">No playlist selected</div>;

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-6 p-4 max-w-[1400px] mx-auto">
        <div className="md:w-96"><Skeleton className="aspect-video rounded-xl mb-4" /><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3"><Skeleton className="w-40 aspect-video rounded-lg" /><div className="flex-1"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></div></div>
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) return <div className="p-8 text-center text-gray-400">Playlist not found</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 max-w-[1400px] mx-auto">
      <div className="md:w-96 shrink-0">
        <div className="aspect-video rounded-xl bg-yt-surface overflow-hidden relative mb-4">
          {playlist.thumbnailUrl && (
            <img src={playlist.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-sm font-medium">{playlist.videoCount} videos</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-1">{playlist.title}</h1>
        {playlist.channel && (
          <div className="flex items-center gap-2 mb-3">
            <ChannelAvatar src={playlist.channel.avatarUrl} alt={playlist.channel.name} size="sm" />
            <span className="text-sm text-gray-300 hover:text-white cursor-pointer">{playlist.channel.name}</span>
          </div>
        )}
        {playlist.description && (
          <p className="text-sm text-gray-400 mb-4">{playlist.description}</p>
        )}

        <div className="flex items-center gap-2 mb-6">
          <Button variant="primary" size="md" icon={<Play size={18} />}>Play all</Button>
          <Button variant="secondary" size="md" icon={<Shuffle size={18} />}>Shuffle</Button>
          <Button variant="icon" size="icon" icon={<Share2 size={18} />} />
          <Button variant="icon" size="icon" icon={<MoreHorizontal size={18} />} />
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {playlist.videos?.map((pv: any, index: number) => (
          <div
            key={pv.id}
            className="flex gap-3 p-2 rounded-xl hover:bg-yt-hover cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-6 text-center text-sm text-gray-400 group-hover:hidden">{index + 1}</span>
              <GripVertical size={16} className="hidden group-hover:block text-gray-400 cursor-grab" />
            </div>
            <div className="relative shrink-0">
              <div className="w-40 aspect-video rounded-lg bg-yt-surface overflow-hidden">
                {pv.video?.thumbnailUrl && (
                  <img src={pv.video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                {pv.video ? formatDuration(pv.video.duration) : '0:00'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white line-clamp-2">{pv.video?.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{pv.video?.channel?.name}</p>
              {pv.video && (
                <p className="text-xs text-gray-400">
                  {formatViews(pv.video.views)} views
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="animate-pulse bg-yt-surface rounded-xl h-48" /></div>}>
      <PlaylistPageContent />
    </Suspense>
  );
}
