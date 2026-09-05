'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { onLCP, onFID, onCLS, onTTFB } from '@/lib/performance';

interface WebVitals {
  LCP: number | null;
  FID: number | null;
  CLS: number | null;
  TTFB: number | null;
  lcpRating: string;
  fidRating: string;
  clsRating: string;
  ttfbRating: string;
}

function formatMetric(value: number | null, unit: string): string {
  if (value === null) return '--';
  if (unit === 'ms') return `${Math.round(value)} ms`;
  if (unit === 'score') return value.toFixed(2);
  return `${value.toFixed(2)}`;
}

function metricRating(value: number | null, type: 'LCP' | 'FID' | 'CLS' | 'TTFB'): string {
  if (value === null) return '';
  switch (type) {
    case 'LCP': return value <= 2500 ? 'Good' : value <= 4000 ? 'Needs Improvement' : 'Poor';
    case 'FID': return value <= 100 ? 'Good' : value <= 300 ? 'Needs Improvement' : 'Poor';
    case 'CLS': return value <= 0.1 ? 'Good' : value <= 0.25 ? 'Needs Improvement' : 'Poor';
    case 'TTFB': return value <= 800 ? 'Good' : value <= 1800 ? 'Needs Improvement' : 'Poor';
  }
}

function metricColor(rating: string): string {
  switch (rating) {
    case 'Good': return 'text-green-600';
    case 'Needs Improvement': return 'text-yellow-600';
    case 'Poor': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

export function WebVitalsMonitor() {
  const [vitals, setVitals] = useState<WebVitals>({
    LCP: null, FID: null, CLS: null, TTFB: null,
    lcpRating: '', fidRating: '', clsRating: '', ttfbRating: '',
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(onLCP((m: any) => setVitals((p: any) => ({ ...p, LCP: m.value, lcpRating: metricRating(m.value, 'LCP') }))));
    unsubs.push(onFID((m: any) => setVitals((p: any) => ({ ...p, FID: m.value, fidRating: metricRating(m.value, 'FID') }))));
    unsubs.push(onCLS((m: any) => setVitals((p: any) => ({ ...p, CLS: m.value, clsRating: metricRating(m.value, 'CLS') }))));
    unsubs.push(onTTFB((m: any) => setVitals((p: any) => ({ ...p, TTFB: m.value, ttfbRating: metricRating(m.value, 'TTFB') }))));
    return () => unsubs.forEach((u) => u());
  }, []);

  const rows: { label: string; value: number | null; rating: string; unit: string }[] = [
    { label: 'LCP', value: vitals.LCP, rating: vitals.lcpRating, unit: 'ms' },
    { label: 'FID', value: vitals.FID, rating: vitals.fidRating, unit: 'ms' },
    { label: 'CLS', value: vitals.CLS, rating: vitals.clsRating, unit: 'score' },
    { label: 'TTFB', value: vitals.TTFB, rating: vitals.ttfbRating, unit: 'ms' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900/90 text-white text-xs rounded-lg p-3 shadow-lg backdrop-blur-sm min-w-[200px]">
      <div className="font-semibold mb-2 text-gray-300 text-[10px] uppercase tracking-wider">
        Core Web Vitals
      </div>
      {rows.map(({ label, value, rating, unit }) => (
        <div key={label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="font-mono">{label}</span>
          <span className={`font-mono ${metricColor(rating)}`}>
            {formatMetric(value, unit)}
            {rating && <span className="ml-1 text-[10px]">({rating})</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function usePrefetchOnVisible(ref: React.RefObject<HTMLElement | null>, url: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, url]);
}

export function useLazyLoad(ref: React.RefObject<HTMLElement | null>, onLoad: () => void) {
  const loaded = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || loaded.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loaded.current = true;
            onLoad();
            observer.disconnect();
          }
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, onLoad]);
}

export function useNetworkQuality() {
  const [quality, setQuality] = useState<'slow' | 'moderate' | 'fast'>('fast');

  useEffect(() => {
    if (!navigator.connection) return;

    const update = () => {
      const conn = navigator.connection;
      if (!conn) return;
      const type = conn.effectiveType;
      if (type === 'slow-2g' || type === '2g') setQuality('slow');
      else if (type === '3g') setQuality('moderate');
      else setQuality('fast');
    };

    update();
    navigator.connection.addEventListener('change', update);
    return () => navigator.connection?.removeEventListener('change', update);
  }, []);

  return quality;
}

export function useIdleCallback(callback: () => void, deps: any[] = []) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    const id = requestIdleCallback(() => savedCallback.current(), { timeout: 2000 });
    return () => cancelIdleCallback(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...deps]);
}
