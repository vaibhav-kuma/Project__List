'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@yt/shared';
import { Home, Compass, PlusSquare, PlaySquare, Library } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/feed/trending', label: 'Shorts', icon: PlaySquare },
  { href: '/studio/upload', label: 'Create', icon: PlusSquare, highlight: true },
  { href: '/feed/subscriptions', label: 'Subscriptions', icon: Compass },
  { href: '/feed/library', label: 'Library', icon: Library },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-yt-bg border-t border-yt-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-0',
                item.highlight ? 'relative' : '',
              )}
            >
              {item.highlight ? (
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center -mt-4 shadow-lg shadow-red-600/30">
                  <item.icon size={20} className="text-white" />
                </div>
              ) : (
                <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
              )}
              {!item.highlight && (
                <span className={cn('text-[10px]', isActive ? 'text-white font-medium' : 'text-gray-400')}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
