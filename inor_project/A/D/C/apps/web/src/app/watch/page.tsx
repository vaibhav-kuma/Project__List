'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatViews, timeAgo, formatDuration, parseTimestamps } from '@yt/shared';
import { ChannelAvatar, Button, Skeleton, CommentSkeleton } from '@yt/ui';
import { api } from '@/lib/api';
import {
  ThumbsUp, ThumbsDown, Share2, Download, Scissors, Bookmark,
  MoreHorizontal, Play, ChevronDown, MessageCircle, RotateCcw,
} from 'lucide-react';

function WatchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get('v');

  const [video, setVideo] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!videoId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [videoRes, commentRes, feedRes] = await Promise.all([
          api.get<{ success: boolean; data: any }>(`/videos/${videoId}`),
          api.get<{ success: boolean; data: any[] }>(`/comments/video/${videoId}`, { params: { sort: 'top' } }),
          api.get<{ success: boolean; data: any[] }>('/feed/home', { params: { limit: 10 } }),
        ]);
        if (videoRes.success) setVideo(videoRes.data);
        if (commentRes.success) setComments(commentRes.data);
        if (feedRes.success) setSuggestions(feedRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Increment view
    api.post(`/videos/${videoId}/view`).catch(() => {});
  }, [videoId]);

  if (!videoId) return <div className="p-8 text-center text-gray-400">No video selected</div>;

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1800px] mx-auto">
        <div className="flex-1">
          <Skeleton className="aspect-video rounded-xl mb-4" />
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="w-full lg:w-[400px] space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="w-40 aspect-video rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!video) return <div className="p-8 text-center text-gray-400">Video not found</div>;

  const chapters = video.description ? parseTimestamps(video.description) : [];

  const handleLike = async () => {
    try {
      await api.post(`/videos/${videoId}/like`);
      setLiked(!liked);
      if (disliked) setDisliked(false);
    } catch {}
  };

  const handleDislike = async () => {
    try {
      await api.post(`/videos/${videoId}/dislike`);
      setDisliked(!disliked);
      if (liked) setLiked(false);
    } catch {}
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1800px] mx-auto">
      <div className="flex-1 min-w-0">
        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 relative group">
          <img
            src={video.thumbnailUrl || '/placeholder-thumbnail.jpg'}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg">
              <Play size={28} className="text-white ml-1" />
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">{video.title}</h1>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{formatViews(video.views)} views</span>
            <span>&bull;</span>
            <span>{video.publishedAt ? timeAgo(video.publishedAt) : 'Unpublished'}</span>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <div className="flex items-center bg-yt-surface rounded-full">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-l-full hover:bg-yt-hover transition-colors ${liked ? 'text-blue-400' : 'text-white'}`}
              >
                <ThumbsUp size={18} />
                <span>{formatViews(video.likes)}</span>
              </button>
              <div className="w-px h-6 bg-yt-border" />
              <button
                onClick={handleDislike}
                className={`px-4 py-2 rounded-r-full hover:bg-yt-hover transition-colors ${disliked ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <ThumbsDown size={18} />
              </button>
            </div>

            <Button variant="secondary" size="md" icon={<Share2 size={18} />}>Share</Button>
            <Button variant="secondary" size="md" icon={<Download size={18} />}>Download</Button>
            <Button variant="icon" size="icon" icon={<Scissors size={18} />} />
            <Button variant="icon" size="icon" icon={<Bookmark size={18} />} />
            <Button variant="icon" size="icon" icon={<MoreHorizontal size={18} />} />
          </div>
        </div>

        {video.channel && (
          <div className="flex items-center gap-4 mb-4 p-4 bg-yt-surface rounded-xl">
            <ChannelAvatar
              src={video.channel.avatarUrl}
              alt={video.channel.name}
              size="lg"
              isVerified={video.channel.isVerified}
            />
            <div className="flex-1">
              <h3 className="font-medium text-white">{video.channel.name}</h3>
              <p className="text-sm text-gray-400">{formatViews(video.channel.subscriberCount || 0)} subscribers</p>
            </div>
            <Button variant="primary" size="md">Subscribe</Button>
            <Button variant="icon" size="icon" icon={<MoreHorizontal size={18} />} />
          </div>
        )}

        <div className="bg-yt-surface rounded-xl p-4 mb-6">
          <div className={`text-sm text-gray-300 ${showDesc ? '' : 'line-clamp-3'}`}>
            {video.description || 'No description'}
          </div>
          {video.description && video.description.length > 200 && (
            <button
              onClick={() => setShowDesc(!showDesc)}
              className="text-white font-medium text-sm mt-2 flex items-center gap-1"
            >
              {showDesc ? 'Show less' : 'Show more'}
              <ChevronDown size={16} className={`transition-transform ${showDesc ? 'rotate-180' : ''}`} />
            </button>
          )}
          {chapters.length > 0 && (
            <div className="mt-3 space-y-1">
              <h4 className="text-sm font-medium text-gray-400">Chapters</h4>
              {chapters.slice(0, showDesc ? undefined : 3).map((ch, i) => (
                <button
                  key={i}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  onClick={() => {}}
                >
                  <RotateCcw size={12} />
                  <span className="text-gray-400">{ch.timestamp}</span>
                  <span>{ch.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {comments.length} Comments
            </h2>
            <Button variant="ghost" size="sm" icon={<MessageCircle size={16} />}>
              Sort by: Top
            </Button>
          </div>

          <div className="flex gap-3 mb-6">
            <ChannelAvatar alt="You" size="md" />
            <div className="flex-1">
              <input
                type="text"
                placeholder="Add a comment..."
                className="w-full bg-transparent border-b border-yt-border pb-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
              />
              <div className="flex justify-end gap-2 mt-2 hidden">
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="primary" size="sm">Comment</Button>
              </div>
            </div>
          </div>

          {comments.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => <CommentSkeleton key={i} />)
          ) : (
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <ChannelAvatar
                    src={comment.user?.avatarUrl}
                    alt={comment.user?.displayName || comment.user?.username}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {comment.user?.displayName || comment.user?.username}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
                      {comment.isPinned && (
                        <span className="text-xs text-gray-400">Pinned</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 mb-2">{comment.content}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <button className="flex items-center gap-1 hover:text-white">
                        <ThumbsUp size={14} /> {comment.likes > 0 && comment.likes}
                      </button>
                      <button className="hover:text-white"><ThumbsDown size={14} /></button>
                      <button className="font-medium hover:text-white">Reply</button>
                      {comment._count?.replies > 0 && (
                        <button className="text-blue-400 hover:text-blue-300">
                          Show {comment._count.replies} replies
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[400px] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Up next</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Autoplay</span>
            <div className="w-8 h-4 bg-yt-hover rounded-full relative cursor-pointer">
              <div className="w-3 h-3 bg-blue-400 rounded-full absolute top-0.5 right-0.5" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {suggestions.map((video: any) => (
            <div
              key={video.id}
              className="flex gap-2 cursor-pointer hover:bg-yt-hover p-1 rounded-lg transition-colors"
              onClick={() => router.push(`/watch?v=${video.id}`)}
            >
              <div className="relative shrink-0">
                <div className="w-40 aspect-video rounded-lg bg-yt-surface overflow-hidden">
                  {video.thumbnailUrl && (
                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                  {formatDuration(video.duration)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white line-clamp-2 leading-5">{video.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{video.channel?.name}</p>
                <p className="text-xs text-gray-400">
                  {formatViews(video.views)} views &bull; {timeAgo(video.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-pulse bg-yt-surface rounded-xl h-96 w-full max-w-4xl" /></div>}>
      <WatchPageContent />
    </Suspense>
  );
}
