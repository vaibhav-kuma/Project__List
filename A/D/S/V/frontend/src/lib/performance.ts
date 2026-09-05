'use client';

type ReportHandler = (metric: any) => void;
type MetricName = 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';

const ratings: Record<string, { good: number; poor: number }> = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: MetricName, value: number): string {
  const threshold = ratings[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

let metricId = 0;
function nextId(): string {
  return `v${++metricId}-${Date.now()}`;
}

const metricCallbacks: any[] = [];

export function onReport(callback: any): () => void {
  metricCallbacks.push(callback);
  return () => {
    const idx = metricCallbacks.indexOf(callback);
    if (idx >= 0) metricCallbacks.splice(idx, 1);
  };
}

function reportMetric(metric: any): void {
  metricCallbacks.forEach((cb: any) => {
    try { cb(metric); } catch {}
  });
  if (process.env.NODE_ENV === 'production') {
    sendMetricToAnalytics(metric);
  }
}

export function onCLS(callback: any): () => void {
  const id = nextId();
  let sessionValue = 0;

  if (typeof window === 'undefined' || !window.PerformanceObserver) return () => {};

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        sessionValue += (entry as any).value || 0;
      }
    }
  });

  observer.observe({ type: 'layout-shift' as any, buffered: true });

  const handler = () => {
    if (document.visibilityState === 'hidden') {
      observer.disconnect();
      reportMetric({ name: 'CLS', value: sessionValue, rating: getRating('CLS', sessionValue), delta: sessionValue, id, entries: [] });
    }
  };
  document.addEventListener('visibilitychange', handler);

  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', handler);
  };
}

export function onFCP(callback: any): () => void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return () => {};
  const id = nextId();
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length > 0) {
      const entry = entries[entries.length - 1] as any;
      const value = entry.startTime;
      reportMetric({ name: 'FCP', value, rating: getRating('FCP', value), delta: value, id, entries: [entry] });
      observer.disconnect();
    }
  });
  observer.observe({ type: 'paint', buffered: true });
  return () => observer.disconnect();
}

export function onLCP(callback: any): () => void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return () => {};
  const id = nextId();
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as any;
    if (lastEntry) {
      reportMetric({ name: 'LCP', value: lastEntry.startTime, rating: getRating('LCP', lastEntry.startTime), delta: lastEntry.startTime, id, entries: [lastEntry] });
    }
  });
  observer.observe({ type: 'largest-contentful-paint' as any, buffered: true });
  return () => observer.disconnect();
}

export function onFID(callback: any): () => void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return () => {};
  const id = nextId();
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      const value = entry.processingStart - entry.startTime;
      reportMetric({ name: 'FID', value, rating: getRating('FID', value), delta: value, id, entries: [entry] });
      observer.disconnect();
      return;
    }
  });
  observer.observe({ type: 'first-input', buffered: true });
  return () => observer.disconnect();
}

export function onINP(callback: any): () => void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return () => {};
  const id = nextId();
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      if (entry.interactionId) {
        reportMetric({ name: 'INP', value: entry.duration, rating: getRating('INP', entry.duration), delta: entry.duration, id, entries: [entry] });
      }
    }
  });
  observer.observe({ type: 'event', buffered: true } as any);
  return () => observer.disconnect();
}

export function onTTFB(callback: any): () => void {
  const id = nextId();
  const navEntry = performance.getEntriesByType('navigation')[0] as any;
  if (navEntry) {
    const value = navEntry.responseStart - navEntry.requestStart;
    reportMetric({ name: 'TTFB', value, rating: getRating('TTFB', value), delta: value, id, entries: [navEntry] });
  }
  return () => {};
}

function sendMetricToAnalytics(metric: any): void {
  try {
    const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, url: window.location.pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/vitals', body);
    } else {
      fetch('/api/analytics/vitals', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  } catch {}
}

export function measurePageLoad(): () => void {
  if (typeof window === 'undefined') return () => {};

  const unsubs = [
    onCLS(reportMetric),
    onFCP(reportMetric),
    onLCP(reportMetric),
    onFID(reportMetric),
    onINP(reportMetric),
    onTTFB(reportMetric),
  ];

  performance.mark('app-init');

  return () => {
    performance.mark('app-ready');
    performance.measure('app-boot', 'app-init', 'app-ready');
    unsubs.forEach((u) => u());
  };
}

export function getMemoryUsage(): { used: number; total: number; limit: number } | null {
  const mem = (performance as any).memory;
  if (mem) return { used: mem.usedJSHeapSize, total: mem.totalJSHeapSize, limit: mem.jsHeapSizeLimit };
  return null;
}

export function markInteraction(name: string): () => void {
  const markName = `interaction-${name}`;
  performance.mark(`${markName}-start`);
  return () => {
    performance.mark(`${markName}-end`);
    performance.measure(markName, `${markName}-start`, `${markName}-end`);
  };
}
