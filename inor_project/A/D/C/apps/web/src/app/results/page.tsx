'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatViews, timeAgo, formatDuration } from '@yt/shared';
import { ChannelAvatar, Chip, Skeleton } from '@yt/ui';
import { api } from '@/lib/api';

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'channel', label: 'Channels' },
  { id: 'playlist', label: 'Playlists' },
];

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('search_query') || '';

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!query) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: any }>('/search', {
          params: { q: query, type: filter, limit: 20 },
        });
        if (res.success) setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query, filter]);

  if (!query) return <div className="p-8 text-center text-gray-400">Enter a search query</div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-4">
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {filterChips.map((chip) => (
          <Chip key={chip.id} label={chip.label} selected={filter === chip.id} onClick={() => setFilter(chip.id)} />
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-60 aspect-video rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : results ? (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            About {results.totalResults} results in {results.searchTime}ms
          </p>

          {results.videos?.map((video: any) => (
            <div
              key={video.id}
              className="flex gap-4 mb-4 cursor-pointer hover:bg-yt-hover p-2 rounded-xl transition-colors"
              onClick={() => router.push(`/watch?v=${video.id}`)}
            >
              <div className="relative shrink-0">
                <div className="w-60 aspect-video rounded-xl bg-yt-surface overflow-hidden">
                  {video.thumbnailUrl && (
                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1 rounded">
                  {formatDuration(video.duration)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-white line-clamp-2">{video.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {formatViews(Number(video.views))} views &bull; {timeAgo(video.createdAt)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <ChannelAvatar src={video.channel?.avatarUrl} alt={video.channel?.name} size="sm" />
                  <span className="text-sm text-gray-400">{video.channel?.name}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{video.description}</p>
              </div>
            </div>
          ))}

          {results.channels?.map((channel: any) => (
            <div
              key={channel.id}
              className="flex items-center gap-4 mb-4 p-4 rounded-xl hover:bg-yt-hover cursor-pointer transition-colors"
              onClick={() => router.push(`/channel/${channel.handle}`)}
            >
              <ChannelAvatar src={channel.avatarUrl} alt={channel.name} size="xl" isVerified={channel.isVerified} />
              <div>
                <h3 className="text-lg font-medium text-white">{channel.name}</h3>
                <p className="text-sm text-gray-400">{channel.handle} &bull; {formatViews(channel.subscriberCount)} subscribers &bull; {channel.videoCount} videos</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{channel.description}</p>
              </div>
            </div>
          ))}

          {results.playlists?.map((playlist: any) => (
            <div
              key={playlist.id}
              className="flex gap-4 mb-4 p-2 rounded-xl hover:bg-yt-hover cursor-pointer transition-colors"
              onClick={() => router.push(`/playlist?list=${playlist.id}`)}
            >
              <div className="w-60 aspect-video rounded-xl bg-yt-surface overflow-hidden relative">
                {playlist.thumbnailUrl && (
                  <img src={playlist.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-medium">Playlist</span>
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-medium text-white">{playlist.title}</h3>
                <p className="text-sm text-gray-400">{playlist.channel?.name}</p>
                <p className="text-sm text-gray-400">{playlist.videoCount} videos</p>
              </div>
            </div>
          ))}

          {!results.videos?.length && !results.channels?.length && !results.playlists?.length && (
            <div className="text-center py-16">
              <p className="text-xl text-gray-400">No results found</p>
              <p className="text-sm text-gray-500 mt-2">Try different keywords or remove filters</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="animate-pulse bg-yt-surface rounded-xl h-32" /></div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
