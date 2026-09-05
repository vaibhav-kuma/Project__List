'use client';

import dynamic from 'next/dynamic';
import { ComponentType, Suspense, lazy } from 'react';

export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = null
) {
  const LazyComponent = lazy(importFn);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

export const LazyVideoChat = dynamic(
  () => import('@/components/chat/VideoChat'),
  {
    loading: () => (
      <div className="w-full h-full min-h-[400px] bg-gray-900 animate-pulse rounded-xl flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading video chat...</div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyVideoControls = dynamic(
  () => import('@/components/chat/VideoControls'),
  { ssr: false }
);

export const LazySessionTimer = dynamic(
  () => import('@/components/chat/SessionTimer'),
  { ssr: false }
);

export const LazyMatchOverlay = dynamic(
  () => import('@/components/chat/MatchOverlay'),
  { ssr: false }
);

export const LazyConnectionQuality = dynamic(
  () => import('@/components/chat/ConnectionQuality'),
  { ssr: false }
);

export const LazyExtendPrompt = dynamic(
  () => import('@/components/chat/ExtendPrompt'),
  { ssr: false }
);

export const LazyReportModal = dynamic(
  () => import('@/components/chat/ReportModal'),
  { ssr: false }
);

export const LazyMatchQueue = dynamic(
  () => import('@/components/chat/MatchQueue'),
  { ssr: false }
);

export const LazyAdminDashboard = dynamic(
  () => import('@/app/admin/page'),
  {
    loading: () => (
      <div className="p-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    ),
  }
);

function safeDynamicImport(path: string) {
  return dynamic(
    () => import(path).catch(() => ({ default: (() => null) as any })),
    { loading: () => null }
  );
}

export const LazyMomentsFeed = safeDynamicImport('@/components/moments/MomentsFeed');
export const LazyModerationPanel = safeDynamicImport('@/components/moderation/ModerationPanel');
export const LazySubscriptionPlans = safeDynamicImport('@/components/subscription/SubscriptionPlans');
export const LazyComplianceDashboard = safeDynamicImport('@/components/compliance/ComplianceDashboard');
export const LazySafetyPanel = safeDynamicImport('@/components/safety/SafetyPanel');

export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  return lazyLoad(importFn, fallback);
}
