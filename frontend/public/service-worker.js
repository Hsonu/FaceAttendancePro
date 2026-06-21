/**
 * AttendEase Service Worker
 * Implements offline support with dynamic caching for Vite-hashed assets.
 */

const CACHE_NAME = 'attendease-cache-v2';

// Only pre-cache truly static assets that don't change names between builds.
// Vite-hashed JS/CSS bundles are cached dynamically on first fetch.
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-style.css',
  '/pwa-script.js'
];

// Install Event — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static app shell');
      // Use individual cache.add() with error swallowing so one failure
      // doesn't prevent SW installation
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[Service Worker] Failed to pre-cache ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate Event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Intercept requests and serve from cache or network
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API requests, HMR, and non-http(s) requests
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('__vite') ||
    url.pathname.includes('node_modules') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // Navigation requests (page loads) — Network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse;
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
