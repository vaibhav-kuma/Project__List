'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SwipeHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export function SwipeHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
}: SwipeHandlerProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX < threshold && absDeltaY < threshold) return;

    if (absDeltaX > absDeltaY) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className = '' }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY !== 0) return;

    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);

    if (distance > 0 && distance < 150) {
      setPulling(true);
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setRefreshing(false);
      }
    }

    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pulling && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
          style={{
            height: `${pullDistance}px`,
            transform: `translateY(-${pullDistance}px)`,
          }}
        >
          <div className={`animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 ${refreshing ? '' : 'opacity-50'}`}></div>
        </div>
      )}
      {children}
    </div>
  );
}

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function MobileBottomSheet({ isOpen, onClose, children, title }: MobileBottomSheetProps) {
  const [translateY, setTranslateY] = useState('100%');

  useEffect(() => {
    if (isOpen) {
      setTranslateY('0%');
      document.body.style.overflow = 'hidden';
    } else {
      setTranslateY('100%');
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl transition-transform duration-300 max-h-[85vh] overflow-y-auto"
        style={{ transform: `translateY(${translateY})` }}
      >
        {title && (
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

interface InstallBannerProps {
  onInstall: () => Promise<boolean>;
}

export function InstallBanner({ onInstall }: InstallBannerProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('install-banner-dismissed');
    if (!hasDismissed) {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstall = async () => {
    const installed = await onInstall();
    if (installed) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('install-banner-dismissed', 'true');
    setShow(false);
    setDismissed(true);
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg p-4 z-40 border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Install Ninor</h3>
          <p className="text-sm text-gray-600 mt-1">Add to home screen for a better experience</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center text-sm z-50">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m0 0a11.97 11.97 0 01-3.535 2.122M5.636 18.364a9 9 0 010-12.728m0 0l2.829 2.829m0 0A11.97 11.97 0 0112 5.636" />
        </svg>
        <span>You are offline. Some features may not work.</span>
      </div>
    </div>
  );
}
