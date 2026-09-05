# Monitoring Setup

## 1. Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alerts/*.yml"

scrape_configs:
  - job_name: 'ninor-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets:
          - 'backend:3001'
          - 'backend:3002'
          - 'backend:3003'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.*):.*'
        replacement: '${1}'

  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - 'node-exporter:9100'

  - job_name: 'postgres-exporter'
    static_configs:
      - targets:
          - 'postgres-exporter:9187'

  - job_name: 'redis-exporter'
    static_configs:
      - targets:
          - 'redis-exporter:9121'
```

## 2. Alert Rules

```yaml
# prometheus/alerts/ninor-alerts.yml
groups:
  - name: ninor-alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }})"
          description: "API error rate is above 5% for the last 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency (p95: {{ $value }}ms)"
          description: "95th percentile API latency is above 500ms"

      - alert: LowCacheHitRate
        expr: rate(cache_hit_count[5m]) / (rate(cache_hit_count[5m]) + rate(cache_miss_count[5m])) < 0.6
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate ({{ $value | humanizePercentage }})"
          description: "Cache hit rate is below 60%"

      - alert: HighConnectionCount
        expr: active_connections > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High active connections ({{ $value }})"
          description: "Active connections exceed 500"

      - alert: HighMemoryUsage
        expr: memory_heap_bytes / 1024 / 1024 > 400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage ({{ $value | humanize1024 }}MB)"
          description: "Heap memory exceeds 400MB"

      - alert: MatchQueueBacklog
        expr: match_queue_length > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Match queue backlog ({{ $value }})"
          description: "Match queue has more than 100 pending users"

      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      - alert: HighWebSocketDisconnects
        expr: rate(websocket_disconnects_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High WebSocket disconnect rate ({{ $value }}/s)"
          description: "More than 10 WebSocket disconnections per second"

      - alert: SlowDatabaseQueries
        expr: rate(database_query_duration_ms_bucket{le="100"}[5m]) / rate(database_query_duration_ms_count[5m]) < 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries"
          description: "Less than 90% of queries complete within 100ms"

      - alert: TURNServerHighLoad
        expr: turn_active_sessions > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TURN server high load ({{ $value }} sessions)"
          description: "TURN server has more than 500 active relay sessions"
```

## 3. Grafana Dashboard (JSON)

```json
{
  "dashboard": {
    "title": "Ninor Performance Dashboard",
    "tags": ["ninor", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "title": "API Request Rate",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [{
          "expr": "rate(http_requests_total[1m])",
          "legendFormat": "{{ route }}"
        }]
      },
      {
        "title": "API Response Time (p95)",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))",
          "legendFormat": "{{ route }}"
        }]
      },
      {
        "title": "Active Connections",
        "type": "graph",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 8 },
        "targets": [{
          "expr": "active_connections",
          "legendFormat": "HTTP"
        }, {
          "expr": "active_websocket_connections",
          "legendFormat": "WebSocket"
        }]
      },
      {
        "title": "Cache Hit Rate",
        "type": "graph",
        "gridPos": { "h": 8, "w": 8, "x": 8, "y": 8 },
        "targets": [{
          "expr": "rate(cache_hit_count[5m]) / (rate(cache_hit_count[5m]) + rate(cache_miss_count[5m])) * 100",
          "legendFormat": "Hit Rate"
        }]
      },
      {
        "title": "Match Queue Length",
        "type": "graph",
        "gridPos": { "h": 8, "w": 8, "x": 16, "y": 8 },
        "targets": [{
          "expr": "match_queue_length",
          "legendFormat": "Queue"
        }]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 },
        "targets": [{
          "expr": "rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) * 100",
          "legendFormat": "Error Rate"
        }]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 },
        "targets": [{
          "expr": "memory_heap_bytes / 1024 / 1024",
          "legendFormat": "Heap"
        }, {
          "expr": "memory_rss_bytes / 1024 / 1024",
          "legendFormat": "RSS"
        }]
      }
    ]
  }
}
```

## 4. Sentry Frontend Setup

```javascript
// frontend/src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

export function initializeSentry(): void {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/api\.ninor\.app/,
          /^https:\/\/ninor\.app/,
        ],
      }),
    ],
    beforeSend(event) {
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type === 'ChunkLoadError' || error?.value?.includes('Failed to fetch')) {
          return null;
        }
      }
      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Loading chunk',
      'Request aborted',
    ],
  });
}

export function captureException(error: Error, context?: Record<string, any>): void {
  if (!SENTRY_DSN) {
    console.error(error);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

export function setUser(userId: string, email?: string, username?: string): void {
  if (SENTRY_DSN) {
    Sentry.setUser({ id: userId, email, username });
  }
}

export function clearUser(): void {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

export function startTransaction(name: string, op: string) {
  if (!SENTRY_DSN) {
    return { finish: () => {} };
  }
  return Sentry.startTransaction({ name, op });
}
```

```javascript
// frontend/sentry.config.js
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // existing config
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
});
```

## 5. Real User Monitoring (RUM)

```typescript
// frontend/src/lib/rum.ts
'use client';

type RUMEvent = {
  type: 'page_load' | 'interaction' | 'api_call' | 'webrtc_stats';
  name: string;
  duration: number;
  metadata?: Record<string, any>;
  timestamp: number;
};

class RUMMonitor {
  private events: RUMEvent[] = [];
  private batchSize = 10;
  private flushInterval = 10000;

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  track(event: Omit<RUMEvent, 'timestamp'>): void {
    this.events.push({ ...event, timestamp: Date.now() });
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const batch = [...this.events];
    this.events = [];

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/rum', JSON.stringify(batch));
      } else {
        await fetch('/api/analytics/rum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
          keepalive: true,
        });
      }
    } catch {}
  }
}

export const rum = new RUMMonitor();

export function trackPageLoad(duration: number): void {
  rum.track({ type: 'page_load', name: window.location.pathname, duration });
}

export function trackInteraction(name: string, duration: number): void {
  rum.track({ type: 'interaction', name, duration });
}

export function trackApiCall(method: string, url: string, duration: number, status: number): void {
  rum.track({
    type: 'api_call',
    name: `${method} ${url}`,
    duration,
    metadata: { status },
  });
}

export function trackWebRTCStats(stats: {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  rtt: number;
}): void {
  rum.track({
    type: 'webrtc_stats',
    name: 'connection_quality',
    duration: 0,
    metadata: stats,
  });
}
```

## 6. Performance Monitoring Middleware

```typescript
// backend/src/middleware/performanceMonitor.ts
import { Request, Response, NextFunction } from 'express';

export function performanceMonitor() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const startCpu = process.cpuUsage();

    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      const cpuUsage = process.cpuUsage(startCpu);

      if (duration > 1000) {
        console.warn(`Slow API: ${req.method} ${req.path} took ${duration.toFixed(0)}ms`);
      }

      if (cpuUsage.user > 50000 || cpuUsage.system > 50000) {
        console.warn(`High CPU: ${req.method} ${req.path} - user: ${cpuUsage.user} system: ${cpuUsage.system}`);
      }
    });

    next();
  };
}
```
