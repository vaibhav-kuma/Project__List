'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SwipeHandler } from './SwipeHandler';

const navItems = [
  { href: '/', label: 'Home', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { href: '/video-chat', label: 'Chat', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )},
  { href: '/moments', label: 'Moments', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { href: '/friends', label: 'Friends', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )},
  { href: '/profile', label: 'Profile', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )},
];

interface MobileNavProps {
  onNavigate?: (href: string) => void;
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.(item.href)}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              {item.icon(isActive)}
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function MobileHeader({ title, showBack, onBack, rightAction }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 md:hidden safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        {rightAction}
      </div>
    </header>
  );
}

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  onNavigate?: (href: string) => void;
  swipeEnabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  pullToRefresh?: () => Promise<void>;
}

export function MobileLayout({
  children,
  title,
  showBack,
  onBack,
  rightAction,
  onNavigate,
  swipeEnabled = true,
  onSwipeLeft,
  onSwipeRight,
  pullToRefresh,
}: MobileLayoutProps) {
  const Content = (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <MobileHeader
        title={title}
        showBack={showBack}
        onBack={onBack}
        rightAction={rightAction}
      />
      <main className="md:pt-4">
        {children}
      </main>
      <MobileNav onNavigate={onNavigate} />
    </div>
  );

  if (swipeEnabled && (onSwipeLeft || onSwipeRight)) {
    return (
      <SwipeHandler
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      >
        {pullToRefresh ? (
          <PullToRefresh onRefresh={pullToRefresh}>
            {Content}
          </PullToRefresh>
        ) : (
          Content
        )}
      </SwipeHandler>
    );
  }

  if (pullToRefresh) {
    return (
      <PullToRefresh onRefresh={pullToRefresh}>
        {Content}
      </PullToRefresh>
    );
  }

  return Content;
}

import { PullToRefresh } from './SwipeHandler';
