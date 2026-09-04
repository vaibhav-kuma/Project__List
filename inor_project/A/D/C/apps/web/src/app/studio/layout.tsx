'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@yt/shared';
import { AuthProvider } from '@/providers';
import {
  LayoutDashboard, Video, BarChart3, MessageCircle, Languages,
  DollarSign, Palette, Music, Settings, ChevronLeft, Youtube,
} from 'lucide-react';

const sidebarItems = [
  { href: '/studio', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio/content', label: 'Content', icon: Video },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '#', label: 'Comments', icon: MessageCircle },
  { href: '#', label: 'Subtitles', icon: Languages },
  { href: '#', label: 'Earn', icon: DollarSign },
  { href: '#', label: 'Customization', icon: Palette },
  { href: '#', label: 'Audio library', icon: Music },
  { href: '#', label: 'Settings', icon: Settings },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#030303]">
        <header className="h-14 bg-[#030303] border-b border-[#3a3a3a] flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-yt-hover rounded-full">
              <ChevronLeft size={20} className={`text-white transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Youtube size={24} className="text-red-600" />
              <span className="text-sm font-semibold text-white">YouTube Studio</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">Go to channel</Link>
            <button className="text-sm text-gray-400 hover:text-white">Send feedback</button>
          </div>
        </header>

        <div className="flex pt-14">
          <aside className={`bg-[#030303] border-r border-[#3a3a3a] transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} hidden md:block fixed left-0 top-14 bottom-0 overflow-y-auto z-30`}>
            <div className="py-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-4 px-4 py-2.5 text-sm transition-colors',
                      collapsed ? 'justify-center px-2' : '',
                      isActive ? 'bg-yt-hover text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-yt-hover',
                    )}
                  >
                    <item.icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </aside>

          <main className={`flex-1 transition-all duration-300 ${collapsed ? 'md:ml-16' : 'md:ml-56'}`}>
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
