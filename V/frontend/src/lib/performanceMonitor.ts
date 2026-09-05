'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: { used: number; total: number; limit: number } | null;
  longTasks: number;
  networkLatency: number;
}

interface MonitorConfig {
  fpsSampleSize?: number;
  longTaskThreshold?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(config: MonitorConfig = {}) {
  const {
    fpsSampleSize = 60,
    longTaskThreshold = 50,
    onMetricsUpdate,
  } = config;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memory: null,
    longTasks: 0,
    networkLatency: 0,
  });

  const frameTimes = useRef<number[]>([]);
  const lastFrameTime = useRef(performance.now());
  const frameIdRef = useRef<number>(0);
  const longTaskCount = useRef(0);
  const rafRunning = useRef(true);

  const measureFrame = useCallback((timestamp: number) => {
    if (!rafRunning.current) return;

    const delta = timestamp - lastFrameTime.current;
    lastFrameTime.current = timestamp;
    frameTimes.current.push(delta);

    if (frameTimes.current.length >= fpsSampleSize) {
      const avg = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      const fps = 1000 / avg;
      const mem = (window.performance as any)?.memory
        ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
          }
        : null;

      const newMetrics: PerformanceMetrics = {
        fps: Math.round(fps),
        frameTime: Math.round(avg),
        memory: mem as any,
        longTasks: longTaskCount.current,
        networkLatency: 0,
      };

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
      frameTimes.current = [];
    }

    frameIdRef.current = requestAnimationFrame(measureFrame);
  }, [fpsSampleSize, onMetricsUpdate]);

  useEffect(() => {
    rafRunning.current = true;
    frameIdRef.current = requestAnimationFrame(measureFrame);

    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > longTaskThreshold) {
          longTaskCount.current++;
        }
      }
    });

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask not supported
    }

    return () => {
      rafRunning.current = false;
      cancelAnimationFrame(frameIdRef.current);
      longTaskObserver.disconnect();
    };
  }, [measureFrame, longTaskThreshold]);

  const resetLongTaskCounter = useCallback(() => {
    longTaskCount.current = 0;
  }, []);

  return { metrics, resetLongTaskCounter };
}
