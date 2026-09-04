'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Compass, Flame, Gamepad2, Music, Clapperboard,
  Newspaper, Trophy, GraduationCap, Radio, ShoppingBag,
  Youtube, Film, Heart, Clock, ThumbsUp, Download,
  History, ListVideo, ChevronDown, Library,
} from 'lucide-react';
import { cn } from '@yt/shared';
import { useAuth } from '@/providers';

interface SidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

const mainLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/feed/trending', label: 'Trending', icon: Flame },
  { href: '/feed/subscriptions', label: 'Subscriptions', icon: Compass },
];

const youLinks = [
  { href: '/feed/library', label: 'Library', icon: Library },
  { href: '/feed/history', label: 'History', icon: History },
  { href: '/playlist?list=WL', label: 'Watch later', icon: Clock },
  { href: '/playlist?list=LL', label: 'Liked videos', icon: ThumbsUp },
  { href: '/feed/trending', label: 'Downloads', icon: Download },
];

const exploreLinks = [
  { href: '/feed/trending?category=music', label: 'Music', icon: Music },
  { href: '/feed/trending?category=gaming', label: 'Gaming', icon: Gamepad2 },
  { href: '/feed/trending?category=news', label: 'News', icon: Newspaper },
  { href: '/feed/trending?category=sports', label: 'Sports', icon: Trophy },
];

export function Sidebar({ collapsed, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-14 bottom-0 w-[72px] bg-yt-bg z-30 hidden md:flex flex-col items-center py-2 gap-1 overflow-y-auto">
        {mainLinks.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-1 py-3 rounded-lg w-full transition-colors',
              isActive(href) ? 'bg-yt-hover' : 'hover:bg-yt-hover',
            )}
          >
            <Icon size={20} className={isActive(href) ? 'text-white' : 'text-gray-300'} />
            <span className="text-[10px] text-gray-300">{label}</span>
          </Link>
        ))}
      </aside>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col gap-1 px-3 pb-4">
      <div className="flex flex-col gap-1 py-2 border-b border-yt-border">
        {mainLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-5 px-3 py-2.5 rounded-lg transition-colors text-sm',
              isActive(href) ? 'bg-yt-hover font-medium' : 'hover:bg-yt-hover',
            )}
          >
            <Icon size={20} className={isActive(href) ? 'text-white' : 'text-gray-300'} />
            {label}
          </Link>
        ))}
      </div>

      {user && (
        <div className="flex flex-col gap-1 py-2 border-b border-yt-border">
          <span className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">You</span>
          {youLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-5 px-3 py-2.5 rounded-lg hover:bg-yt-hover transition-colors text-sm"
            >
              <Icon size={20} className="text-gray-300" />
              {label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 py-2 border-b border-yt-border">
        <span className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Explore</span>
        {exploreLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-5 px-3 py-2.5 rounded-lg hover:bg-yt-hover transition-colors text-sm"
          >
            <Icon size={20} className="text-gray-300" />
            {label}
          </Link>
        ))}
        <button className="flex items-center gap-5 px-3 py-2.5 rounded-lg hover:bg-yt-hover transition-colors text-sm text-gray-300 w-full">
          <ChevronDown size={20} />
          Show more
        </button>
      </div>

      <div className="flex flex-col gap-1 py-2 border-b border-yt-border">
        <span className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">More from YouTube</span>
        {[
          { href: '#', label: 'YouTube Premium', icon: Youtube },
          { href: '#', label: 'YouTube Studio', icon: Film },
          { href: '#', label: 'YouTube Music', icon: Music },
          { href: '#', label: 'YouTube Kids', icon: Clapperboard },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            onClick={onClose}
            className="flex items-center gap-5 px-3 py-2.5 rounded-lg hover:bg-yt-hover transition-colors text-sm"
          >
            <Icon size={20} className="text-gray-300" />
            {label}
          </Link>
        ))}
      </div>

      <div className="px-3 py-3 text-xs text-gray-500 space-y-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <Link href="#" className="hover:text-gray-300">About</Link>
          <Link href="#" className="hover:text-gray-300">Press</Link>
          <Link href="#" className="hover:text-gray-300">Copyright</Link>
          <Link href="#" className="hover:text-gray-300">Contact</Link>
          <Link href="#" className="hover:text-gray-300">Creators</Link>
          <Link href="#" className="hover:text-gray-300">Advertise</Link>
          <Link href="#" className="hover:text-gray-300">Developers</Link>
          <Link href="#" className="hover:text-gray-300">Terms</Link>
          <Link href="#" className="hover:text-gray-300">Privacy</Link>
          <Link href="#" className="hover:text-gray-300">Policy & Safety</Link>
        </div>
        <p className="mt-2">&copy; 2024 YouTube Clone</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-14 bottom-0 w-60 bg-yt-bg z-30 overflow-y-auto hidden md:block">
        {sidebarContent}
      </aside>
      {onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        >
          <aside
            className="w-72 h-full bg-yt-bg overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
