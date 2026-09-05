const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `image-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const FONT_CACHE = `font-${CACHE_VERSION}`;

const MAX_ITEMS = 100;
const MAX_IMAGE_ITEMS = 200;
const MAX_IMAGE_AGE = 7 * 24 * 60 * 60;

const API_CACHE_PATHS = [
  /\/api\/users\/me$/,
  /\/api\/friends$/,
  /\/api\/moments\?/,
  /\/api\/subscription/,
];

const NAVIGATION_URLS = [
  '/',
  '/chat',
  '/video-chat',
  '/friends',
  '/moments',
  '/profile',
  '/subscription',
  '/offline',
  '/legal',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/offline',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== STATIC_CACHE &&
                   name !== DYNAMIC_CACHE &&
                   name !== IMAGE_CACHE &&
                   name !== API_CACHE &&
                   name !== FONT_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

function fromCache(request) {
  return caches.open(STATIC_CACHE).then((cache) => {
    return cache.match(request).then((matching) => {
      return matching || Promise.reject('no-match');
    });
  });
}

function updateCache(request, response) {
  if (response.type === 'opaque' || response.status !== 200) return;
  return caches.open(DYNAMIC_CACHE).then((cache) => {
    return cache.put(request, response.clone()).then(() => {
      return cache.keys().then((keys) => {
        if (keys.length > MAX_ITEMS) {
          cache.delete(keys[0]);
        }
      });
    });
  });
}

function cacheImage(request, response) {
  if (response.type === 'opaque' || response.status !== 200) return;
  return caches.open(IMAGE_CACHE).then((cache) => {
    return cache.put(request, response.clone()).then(() => {
      trimCache(IMAGE_CACHE, MAX_IMAGE_ITEMS);
    });
  });
}

function cacheApiResponse(request, response) {
  if (response.type === 'opaque' || response.status !== 200) return;
  const url = new URL(request.url);
  const cacheKey = `${url.pathname}${url.search}`;
  return caches.open(API_CACHE).then((cache) => {
    const headers = new Headers(response.headers);
    headers.set('sw-fetched-at', Date.now().toString());
    const cachedResponse = new Response(response.clone().body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    return cache.put(cacheKey, cachedResponse);
  });
}

function trimCache(cacheName, maxItems) {
  return caches.open(cacheName).then((cache) => {
    return cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
      }
    });
  });
}

function isApiCacheable(url) {
  return API_CACHE_PATHS.some((pattern) => pattern.test(url));
}

function shouldUseCacheFirst(url) {
  const { pathname } = new URL(url);
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.match(/\.(js|css)$/) ||
    pathname.startsWith('/icons/') ||
    NAVIGATION_URLS.includes(pathname)
  );
}

function isImageRequest(url) {
  const { pathname } = new URL(url);
  return (
    pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/) ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/icons/')
  );
}

function isFontRequest(url) {
  const { pathname } = new URL(url);
  return pathname.match(/\.(woff|woff2|ttf|eot)$/);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method !== 'GET') return;

  if (isFontRequest(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          return caches.open(FONT_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  if (isImageRequest(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((response) => {
          cacheImage(request, response);
          return response.clone();
        }).catch(() => cached);

        return cached || fetched;
      })
    );
    return;
  }

  if (isApiCacheable(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          cacheApiResponse(request, response);
          return response.clone();
        }).catch(() => cached);

        if (cached) {
          const cachedAt = cached.headers.get('sw-fetched-at');
          if (cachedAt && Date.now() - parseInt(cachedAt) < 30000) {
            return cached;
          }
        }

        return fetchPromise;
      })
    );
    return;
  }

  if (shouldUseCacheFirst(url.href)) {
    event.respondWith(
      fromCache(request).catch(() => {
        return fetch(request).then((response) => {
          updateCache(request, response);
          return response.clone();
        }).catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        return response;
      }).catch(() => {
        return caches.match('/offline').then((offlinePage) => {
          return offlinePage || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response.status === 200) {
        updateCache(request, response);
      }
      return response;
    }).catch(() => {
      return caches.match(request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        type: data.type || 'notification',
        id: data.id,
      },
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Ninor', options)
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification('Ninor', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action) {
    const actionUrl = event.notification.data?.actions?.find(
      (a) => a.action === event.action
    )?.url;
    if (actionUrl) {
      clients.openWindow(actionUrl);
      return;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
  if (event.tag === 'sync-moments') {
    event.waitUntil(syncPendingMoments());
  }
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncPendingReports());
  }
});

async function syncPendingMessages() {
  const cache = await caches.open('pending-messages');
  const requests = await cache.keys();
  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch {}
  }
}

async function syncPendingMoments() {
  const cache = await caches.open('pending-moments');
  const requests = await cache.keys();
  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch {}
  }
}

async function syncPendingReports() {
  const cache = await caches.open('pending-reports');
  const requests = await cache.keys();
  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch {}
  }
}
