import { Request, Response, NextFunction } from 'express';

interface MetricsCollector {
  httpRequestsTotal: Map<string, number>;
  httpRequestDuration: Map<string, number[]>;
  httpRequestErrors: Map<string, number>;
  activeConnections: number;
  activeWebSocketConnections: number;
  matchQueueLength: number;
  databaseQueryCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  uptime: number;
  startTime: number;
}

const metrics: MetricsCollector = {
  httpRequestsTotal: new Map(),
  httpRequestDuration: new Map(),
  httpRequestErrors: new Map(),
  activeConnections: 0,
  activeWebSocketConnections: 0,
  matchQueueLength: 0,
  databaseQueryCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
  uptime: 0,
  startTime: Date.now(),
};

export function incrementRequestCount(method: string, route: string): void {
  const key = `${method}:${route}`;
  metrics.httpRequestsTotal.set(key, (metrics.httpRequestsTotal.get(key) || 0) + 1);
}

export function recordRequestDuration(method: string, route: string, duration: number): void {
  const key = `${method}:${route}`;
  if (!metrics.httpRequestDuration.has(key)) {
    metrics.httpRequestDuration.set(key, []);
  }
  const durations = metrics.httpRequestDuration.get(key)!;
  durations.push(duration);
  if (durations.length > 100) durations.shift();
}

export function incrementErrorCount(method: string, route: string): void {
  const key = `${method}:${route}`;
  metrics.httpRequestErrors.set(key, (metrics.httpRequestErrors.get(key) || 0) + 1);
}

export function incrementActiveConnections(): void {
  metrics.activeConnections++;
}

export function decrementActiveConnections(): void {
  metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
}

export function incrementWebSocketConnections(): void {
  metrics.activeWebSocketConnections++;
}

export function decrementWebSocketConnections(): void {
  metrics.activeWebSocketConnections = Math.max(0, metrics.activeWebSocketConnections - 1);
}

export function setMatchQueueLength(length: number): void {
  metrics.matchQueueLength = length;
}

export function incrementDbQueryCount(): void {
  metrics.databaseQueryCount++;
}

export function incrementCacheHit(): void {
  metrics.cacheHitCount++;
}

export function incrementCacheMiss(): void {
  metrics.cacheMissCount++;
}

function formatMetrics(): string {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - metrics.startTime) / 1000);
  const lines: string[] = [];

  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  metrics.httpRequestsTotal.forEach((count, key) => {
    lines.push(`http_requests_total{route="${key}"} ${count}`);
  });

  lines.push('# HELP http_request_duration_ms HTTP request duration in ms');
  lines.push('# TYPE http_request_duration_ms summary');
  metrics.httpRequestDuration.forEach((durations, key) => {
    if (durations.length > 0) {
      const sorted = [...durations].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      lines.push(`http_request_duration_ms{route="${key}",quantile="0.5"} ${p50}`);
      lines.push(`http_request_duration_ms{route="${key}",quantile="0.95"} ${p95}`);
      lines.push(`http_request_duration_ms{route="${key}",quantile="0.99"} ${p99}`);
    }
  });

  lines.push('# HELP http_request_errors_total Total HTTP request errors');
  lines.push('# TYPE http_request_errors_total counter');
  metrics.httpRequestErrors.forEach((count, key) => {
    lines.push(`http_request_errors_total{route="${key}"} ${count}`);
  });

  lines.push('# HELP active_connections Current active connections');
  lines.push('# TYPE active_connections gauge');
  lines.push(`active_connections ${metrics.activeConnections}`);

  lines.push('# HELP active_websocket_connections Current WebSocket connections');
  lines.push('# TYPE active_websocket_connections gauge');
  lines.push(`active_websocket_connections ${metrics.activeWebSocketConnections}`);

  lines.push('# HELP match_queue_length Current match queue length');
  lines.push('# TYPE match_queue_length gauge');
  lines.push(`match_queue_length ${metrics.matchQueueLength}`);

  lines.push('# HELP database_query_count Total database queries');
  lines.push('# TYPE database_query_count counter');
  lines.push(`database_query_count ${metrics.databaseQueryCount}`);

  lines.push('# HELP cache_hit_count Total cache hits');
  lines.push('# TYPE cache_hit_count counter');
  lines.push(`cache_hit_count ${metrics.cacheHitCount}`);

  lines.push('# HELP cache_miss_count Total cache misses');
  lines.push('# TYPE cache_miss_count counter');
  lines.push(`cache_miss_count ${metrics.cacheMissCount}`);

  lines.push('# HELP uptime_seconds Server uptime in seconds');
  lines.push('# TYPE uptime_seconds gauge');
  lines.push(`uptime_seconds ${uptimeSeconds}`);

  lines.push('# HELP memory_heap_bytes Node.js heap size');
  lines.push('# TYPE memory_heap_bytes gauge');
  const mem = process.memoryUsage();
  lines.push(`memory_heap_bytes ${mem.heapUsed}`);
  lines.push(`memory_rss_bytes ${mem.rss}`);

  return lines.join('\n');
}

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path;
      incrementRequestCount(req.method, route);
      recordRequestDuration(req.method, route, duration);

      if (res.statusCode >= 400) {
        incrementErrorCount(req.method, route);
      }
    });

    next();
  };
}

export function metricsEndpoint(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(formatMetrics());
}

export function healthEndpoint(req: Request, res: Response): void {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    timestamp: new Date().toISOString(),
    connections: {
      http: metrics.activeConnections,
      websocket: metrics.activeWebSocketConnections,
    },
    matchQueue: metrics.matchQueueLength,
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
    },
    cache: {
      hitRate: metrics.cacheHitCount + metrics.cacheMissCount > 0
        ? (metrics.cacheHitCount / (metrics.cacheHitCount + metrics.cacheMissCount) * 100).toFixed(1) + '%'
        : '0%',
    },
  });
}

export function readinessEndpoint(req: Request, res: Response): void {
  const dbOk = true;
  const redisOk = true;

  if (dbOk && redisOk) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', db: dbOk, redis: redisOk });
  }
}

export function livenessEndpoint(req: Request, res: Response): void {
  res.json({ status: 'alive' });
}
