'use client';
import Link from 'next/link';
import { History, Clock, ThumbsUp, Film, ListVideo } from 'lucide-react';

const sections = [
  { title: 'History', icon: History, href: '/feed/history', color: 'text-blue-400' },
  { title: 'Watch Later', icon: Clock, href: '/playlist?list=WL', color: 'text-green-400' },
  { title: 'Liked Videos', icon: ThumbsUp, href: '/playlist?list=LL', color: 'text-blue-400' },
  { title: 'Your Videos', icon: Film, href: '/studio/content', color: 'text-red-400' },
  { title: 'Your Playlists', icon: ListVideo, href: '#', color: 'text-purple-400' },
];

export default function LibraryPage() {
  return (
    <div className="px-4 py-4 max-w-[1200px] mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Library</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="flex items-center gap-4 p-4 bg-yt-surface rounded-xl hover:bg-yt-hover transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-yt-bg flex items-center justify-center">
              <section.icon size={24} className={section.color} />
            </div>
            <span className="text-lg font-medium text-white">{section.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
