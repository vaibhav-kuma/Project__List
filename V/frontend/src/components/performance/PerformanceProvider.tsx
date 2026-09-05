'use client';

import { useEffect, useRef, ReactNode, createContext, useContext } from 'react';
import { measurePageLoad } from '@/lib/performance';
import { usePerformanceMonitor } from '@/lib/performanceMonitor';

interface PerformanceContextValue {
  isLowEndDevice: boolean;
  isLowBandwidth: boolean;
  shouldReduceQuality: boolean;
  fps: number;
  memoryUsage: { used: number; total: number; limit: number } | null;
}

const PerformanceContext = createContext<PerformanceContextValue>({
  isLowEndDevice: false,
  isLowBandwidth: false,
  shouldReduceQuality: false,
  fps: 60,
  memoryUsage: null,
});

export function usePerformance() {
  return useContext(PerformanceContext);
}

function detectLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const mem = (navigator as any).deviceMemory;
  if (mem && mem < 4) return true;
  const cores = navigator.hardwareConcurrency;
  if (cores && cores < 4) return true;
  return false;
}

function detectLowBandwidth(): boolean {
  if (typeof navigator === 'undefined' || !navigator.connection) return false;
  const conn = navigator.connection;
  if (conn.saveData) return true;
  const type = conn.effectiveType;
  return type === 'slow-2g' || type === '2g';
}

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const { metrics } = usePerformanceMonitor({
    fpsSampleSize: 30,
    longTaskThreshold: 50,
  });

  const contextValue: PerformanceContextValue = {
    isLowEndDevice: detectLowEndDevice(),
    isLowBandwidth: detectLowBandwidth(),
    shouldReduceQuality: detectLowEndDevice() || detectLowBandwidth() || metrics.fps < 30,
    fps: metrics.fps,
    memoryUsage: metrics.memory,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function PerformanceTracker({ enabled = true }: { enabled?: boolean }) {
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    cleanupRef.current = measurePageLoad();
    return () => cleanupRef.current?.();
  }, [enabled]);

  return null;
}

export function ScriptLoader({
  src,
  strategy = 'afterInteractive',
  onLoad,
}: {
  src: string;
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  onLoad?: () => void;
}) {
  useEffect(() => {
    if (strategy === 'lazyOnload') {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const script = document.createElement('script');
              script.src = src;
              script.async = true;
              script.onload = onLoad || null;
              document.body.appendChild(script);
              observer.disconnect();
            }
          }
        },
        { rootMargin: '200px' }
      );

      const sentinel = document.createElement('div');
      sentinel.style.position = 'absolute';
      sentinel.style.bottom = '0';
      document.body.appendChild(sentinel);
      observer.observe(sentinel);

      return () => {
        observer.disconnect();
        sentinel.remove();
      };
    }
  }, [src, strategy, onLoad]);

  return null;
}
