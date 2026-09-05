# CDN & Static Asset Optimization Guide

## CDN Configuration (Cloudflare)

### 1. Cloudflare Setup

```toml
# cloudflare.toml
name = "ninor"
type = "web"

[build]
  command = "cd frontend && npm run build"
  publish = "frontend/out"

[[routes]]
  pattern = "*.ninor.app"
  zone = "ninor.app"
  custom_domain = true
```

### 2. Cloudflare Workers (Edge Caching)

```javascript
// workers/cdn-worker.js
const STATIC_TTL = 31536000;
const IMAGE_TTL = 86400;
const API_TTL = 60;

async function handleRequest(request) {
  const url = new URL(request.url);
  const cache = caches.default;

  // Only cache GET requests
  if (request.method !== 'GET') {
    return fetch(request);
  }

  // Check cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  const responseToCache = response.clone();

  // Determine TTL based on path
  let ttl;
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
    ttl = STATIC_TTL;
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    ttl = IMAGE_TTL;
  } else if (url.pathname.startsWith('/api/')) {
    ttl = API_TTL;
  } else {
    ttl = 60;
  }

  // Set cache headers
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
  headers.set('CDN-Cache-Control', `public, max-age=${ttl}`);
  headers.set('Cloudflare-CDN-Cache-Control', `public, max-age=${ttl}`);

  const cacheableResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers: headers,
  });

  // Store in cache
  event.waitUntil(cache.put(request, cacheableResponse.clone()));

  return cacheableResponse;
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
```

### 3. Cloudflare Page Rules

```
# Static assets cache
URL: *ninor.app/_next/static/*
Cache Level: Cache Everything
Edge Cache TTL: 1 year
Browser Cache TTL: 1 year

# Images
URL: *ninor.app/images/*
Cache Level: Cache Everything
Edge Cache TTL: 1 month
Browser Cache TTL: 1 week

# API (no cache for dynamic)
URL: *ninor.app/api/*
Cache Level: Bypass
Browser Cache TTL: 0

# Service Worker
URL: *ninor.app/sw.js
Cache Level: Bypass
Browser Cache TTL: 0
```

### 4. AWS CloudFront Configuration

```json
{
  "DistributionConfig": {
    "Origins": {
      "Items": [{
        "Id": "ninor-origin",
        "DomainName": "ninor-api.herokuapp.com",
        "OriginProtocolPolicy": "https-only",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }],
      "Quantity": 1
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "ninor-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Items": ["GET", "HEAD", "OPTIONS"],
        "Quantity": 3
      },
      "CachedMethods": {
        "Items": ["GET", "HEAD", "OPTIONS"],
        "Quantity": 3
      },
      "Compress": true,
      "DefaultTTL": 60,
      "MaxTTL": 31536000,
      "MinTTL": 0,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": { "Forward": "none" }
      }
    },
    "CacheBehaviors": {
      "Items": [
        {
          "PathPattern": "_next/static/*",
          "TargetOriginId": "ninor-origin",
          "ViewerProtocolPolicy": "redirect-to-https",
          "Compress": true,
          "DefaultTTL": 31536000,
          "MaxTTL": 31536000,
          "ForwardedValues": {
            "QueryString": false,
            "Cookies": { "Forward": "none" }
          }
        },
        {
          "PathPattern": "icons/*",
          "TargetOriginId": "ninor-origin",
          "ViewerProtocolPolicy": "redirect-to-https",
          "Compress": true,
          "DefaultTTL": 86400,
          "MaxTTL": 31536000,
          "ForwardedValues": {
            "QueryString": false,
            "Cookies": { "Forward": "none" }
          }
        },
        {
          "PathPattern": "api/*",
          "TargetOriginId": "ninor-origin",
          "ViewerProtocolPolicy": "redirect-to-https",
          "Compress": true,
          "DefaultTTL": 0,
          "MaxTTL": 0,
          "ForwardedValues": {
            "QueryString": true,
            "Cookies": { "Forward": "all" }
          }
        }
      ],
      "Quantity": 3
    },
    "PriceClass": "PriceClass_100",
    "Enabled": true,
    "HttpVersion": "http2",
    "IPV6Enabled": true,
    "CustomErrorResponses": {
      "Quantity": 1,
      "Items": [{
        "ErrorCode": 404,
        "ResponsePagePath": "/404.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 60
      }]
    }
  }
}
```

## Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/ninor
upstream backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

upstream frontend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 80;
    server_name ninor.app *.ninor.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ninor.app *.ninor.app;

    ssl_certificate /etc/ssl/certs/ninor.crt;
    ssl_certificate_key /etc/ssl/private/ninor.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip compression
    gzip on;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/woff
        font/woff2;
    gzip_proxied any;
    gzip_vary on;
    gzip_disable "msie6";

    # Brotli compression (if module available)
    brotli on;
    brotli_comp_level 6;
    brotli_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        image/svg+xml
        font/woff
        font/woff2;

    # Static assets - long cache
    location /_next/static/ {
        proxy_pass http://frontend;
        proxy_cache STATIC;
        proxy_cache_valid 200 365d;
        proxy_cache_use_stale error timeout updating;
        add_header Cache-Control "public, immutable, max-age=31536000";
        expires 365d;
        access_log off;
    }

    location /icons/ {
        alias /var/www/ninor/icons/;
        add_header Cache-Control "public, max-age=86400";
        expires 1d;
        access_log off;
    }

    # Images - medium cache
    location /images/ {
        proxy_pass http://frontend;
        proxy_cache STATIC;
        proxy_cache_valid 200 7d;
        proxy_cache_use_stale error timeout updating;
        add_header Cache-Control "public, max-age=604800";
        expires 7d;
    }

    # API - no cache
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache 1;
        proxy_cache off;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Service Worker - no cache
    location /sw.js {
        proxy_pass http://frontend;
        proxy_cache off;
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Service-Worker-Allowed "/";
        access_log off;
    }

    # Frontend SPA
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache STATIC;
        proxy_cache_valid 200 60s;
        proxy_cache_use_stale error timeout updating;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}

# Cache zone
proxy_cache_path /var/cache/nginx/static levels=1:2 keys_zone=STATIC:100m inactive=30d max_size=10g use_temp_path=off;
```

## Image Optimization Pipeline

```bash
# Image optimization script (scripts/optimize-images.sh)
#!/bin/bash
INPUT_DIR="./public/images"
OUTPUT_DIR="./public/images/optimized"

for img in $INPUT_DIR/*.{jpg,jpeg,png}; do
    filename=$(basename -- "$img")
    name="${filename%.*}"

    # WebP
    cwebp -q 85 "$img" -o "$OUTPUT_DIR/$name.webp"

    # AVIF
    avifenc -q 85 "$img" "$OUTPUT_DIR/$name.avif"

    # Resized versions
    for size in 320 640 960 1280; do
        convert "$img" -resize ${size}x -quality 85 "$OUTPUT_DIR/${name}_${size}.jpg"
    done
done
```

## CDN Performance Headers Strategy

| Asset Type | Cache Duration | CDN Cache | Strategy |
|-----------|---------------|-----------|----------|
| JS/CSS bundles | 365 days | Yes | Immutable, content-hash filename |
| Images (user uploads) | 7 days | Yes | Cache-first, background revalidate |
| Font files | 365 days | Yes | Cache-first (rarely change) |
| API responses (GET) | 30s-5min | Depends | Stale-while-revalidate |
| User data API | 30s | No | Network-first, short cache |
| Service Worker | 0 | No | Must revalidate on update |
| HTML pages | 60s | Yes | Network-first, SW fallback |
| WebSocket | N/A | No | Direct connection |

## Environment Variables for CDN

```env
# .env.production
NEXT_PUBLIC_CDN_URL=https://cdn.ninor.app
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1
REDIS_URL=redis://redis-cluster:6379
DATABASE_URL=postgresql://user:pass@db-proxy:5432/ninor
TURN_URL=turn:turn.ninor.app:3478
TURN_USERNAME=ninor
TURN_CREDENTIAL=xxx
```

## CDN Resource URLs

```javascript
// frontend/src/lib/cdn.js
export function getCdnUrl(path) {
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdn) return path;
  return `${cdn}${path.startsWith('/') ? path : '/' + path}`;
}

export function getImageUrl(path, { width, quality } = {}) {
  if (!path) return '/placeholder.svg';
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  const base = cdn ? `${cdn}${path}` : path;

  if (width) {
    return `${base}?w=${width}&q=${quality || 85}`;
  }
  return base;
}

export function getAvatarUrl(userId, avatarPath) {
  if (!avatarPath) return '/default-avatar.svg';
  return getImageUrl(avatarPath, { width: 96 });
}
```

## Performance Budget

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Total Bundle Size | < 200KB | > 300KB | > 500KB |
| First Contentful Paint | < 1.5s | > 2.5s | > 4s |
| Largest Contentful Paint | < 2.5s | > 4s | > 6s |
| Time to Interactive | < 3.5s | > 5s | > 8s |
| First Input Delay | < 100ms | > 200ms | > 300ms |
| Cumulative Layout Shift | < 0.1 | > 0.25 | > 0.5 |
| Lighthouse Score | > 90 | > 70 | < 50 |
| API Response Time (p95) | < 200ms | > 500ms | > 1000ms |
| WebSocket Latency | < 50ms | > 100ms | > 200ms |
| Image Size (avg) | < 100KB | > 200KB | > 500KB |
