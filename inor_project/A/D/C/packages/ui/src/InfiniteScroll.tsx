'use client';
import { useRef, useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  children: ReactNode;
  threshold?: number;
}

export function InfiniteScroll({ loadMore, hasMore, loading, children, threshold = 200 }: InfiniteScrollProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: `${threshold}px` },
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, threshold]);

  return (
    <div>
      {children}
      {hasMore && (
        <div ref={observerRef} className="flex justify-center py-8">
          {loading && <Loader2 className="h-8 w-8 text-red-600 animate-spin" />}
        </div>
      )}
    </div>
  );
}
