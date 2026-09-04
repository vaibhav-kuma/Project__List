'use client';
import { VideoCardSkeleton } from '@yt/ui';

export default function Loading() {
  return (
    <div className="px-4 py-4">
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 w-16 bg-yt-surface rounded-lg animate-pulse shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
