'use client';
import { useState } from 'react';
import Link from 'next/link';
import { SearchBar } from '@yt/ui';
import { useAuth } from '@/providers';
import {
  Menu, Youtube, Video, Bell, User, Search, Mic,
  ChevronDown, Upload, LogOut, Sun, Moon, Settings,
} from 'lucide-react';
import { DropdownMenu } from '@yt/ui';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const handleSearch = (query: string) => {
    window.location.href = `/results?search_query=${encodeURIComponent(query)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-yt-bg flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-yt-hover rounded-full transition-colors"
        >
          <Menu size={20} className="text-white" />
        </button>
        <Link href="/" className="flex items-center gap-1">
          <Youtube size={28} className="text-red-600" />
          <span className="text-lg font-semibold tracking-tight hidden sm:inline">YouTube</span>
          <span className="text-[10px] text-gray-400 self-start -ml-1">IN</span>
        </Link>
      </div>

      <div className="hidden md:flex items-center flex-1 max-w-[600px] mx-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      <div className="flex items-center gap-2">
        <button className="md:hidden p-2 hover:bg-yt-hover rounded-full">
          <Search size={20} />
        </button>
        <button className="p-2 hover:bg-yt-hover rounded-full">
          <Mic size={20} />
        </button>

        {user ? (
          <>
            <DropdownMenu
              trigger={
                <button className="p-2 hover:bg-yt-hover rounded-full">
                  <Video size={20} />
                </button>
              }
              items={[
                { label: 'Upload video', icon: <Upload size={16} />, onClick: () => window.location.href = '/studio/upload' },
                { label: 'Go live', icon: <Video size={16} /> },
                { label: 'Create post', icon: <ChevronDown size={16} />, divider: true },
              ]}
            />

            <button className="p-2 hover:bg-yt-hover rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>

            <DropdownMenu
              trigger={
                <button className="p-1 hover:bg-yt-hover rounded-full">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                </button>
              }
              items={[
                { label: 'Your channel', icon: <User size={16} /> },
                { label: 'YouTube Studio', icon: <Settings size={16} />, onClick: () => window.location.href = '/studio' },
                { label: 'Your videos', divider: true },
                { label: 'Purchases & memberships' },
                { label: 'Watch later', divider: true },
                { label: 'Appearance: Dark', icon: <Moon size={16} /> },
                { label: 'Language: English' },
                { label: 'Settings', divider: true },
                { label: 'Sign out', icon: <LogOut size={16} />, onClick: logout },
              ]}
            />
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 border border-gray-600 text-blue-400 hover:bg-blue-500/10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          >
            <User size={20} />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
