'use client';
import { useState, useEffect } from 'react';
import { VideoCard, VideoCardSkeleton, ChipBar, InfiniteScroll } from '@yt/ui';
import { api } from '@/lib/api';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'news', label: 'News' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'education', label: 'Education' },
  { id: 'technology', label: 'Science & Technology' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'live', label: 'Live' },
];

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
  previewGifUrl?: string;
  duration: number;
  views: string;
  createdAt: string;
  channel?: {
    id: string;
    name: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchVideos = async (pageNum: number, cat: string, append = false) => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Video[]; pagination: { hasNext: boolean } }>('/feed/home', {
        params: { page: pageNum, category: cat, limit: 20 },
      });
      if (res.success) {
        setVideos(append ? (prev) => [...prev, ...res.data] : res.data);
        setHasMore(res.pagination.hasNext);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchVideos(1, category);
  }, [category]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage, category, true);
  };

  return (
    <div className="px-4 py-4">
      <div className="sticky top-14 z-20 bg-yt-bg -mx-4 px-4 -mt-4 mb-4">
        <ChipBar
          chips={categories}
          selectedId={category}
          onSelect={setCategory}
          className="py-3"
        />
      </div>

      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} loading={loading}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={`skel-${i}`} />
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}
