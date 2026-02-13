// Service Worker for WiFi Portal - Optimized for Vite + MikroTik Hotspot
const CACHE_NAME = 'wifi-portal-v2';
const RUNTIME_CACHE = 'wifi-portal-runtime-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// ============================================================
// HOTSPOT DETECTION HELPERS
// ============================================================

/**
 * Returns true if this URL is a MikroTik hotspot redirect or login URL.
 * MikroTik appends ?dst=<original_url> when redirecting unauthenticated users.
 */
function isHotspotURL(url) {
  return (
    url.pathname === '/login' ||
    url.pathname === '/logout' ||
    url.pathname === '/status' ||
    url.searchParams.has('dst') ||
    url.searchParams.has('link-login') ||
    url.searchParams.has('link-orig') ||
    url.hostname.includes('hotspot')
  );
}

/**
 * Returns true if this is a captive portal probe request from the OS.
 * Windows uses msftconnecttest.com, Apple uses captive.apple.com, etc.
 */
function isCaptiveProbe(url) {
  const probeHosts = [
    'msftconnecttest.com',
    'msftncsi.com',
    'captive.apple.com',
    'connectivitycheck.gstatic.com',
    'connectivitycheck.android.com',
    'clients3.google.com',
    'detectportal.firefox.com'
  ];
  return probeHosts.some(host => url.hostname.includes(host));
}

// ============================================================
// INSTALL - Cache static assets
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ============================================================
// ACTIVATE - Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ============================================================
// FETCH - Intelligent caching with hotspot awareness
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests - let them pass through normally
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http protocols (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // ── CRITICAL: Never intercept hotspot login/redirect URLs ──
  // MikroTik redirects to /login?dst=... — must always hit network
  if (isHotspotURL(url)) {
    console.log('[SW] Hotspot URL detected, bypassing cache:', url.pathname);
    event.respondWith(
      fetch(request)
        .catch((error) => {
          console.error('[SW] Hotspot fetch failed:', error);
          // Return a minimal valid Response so the SW doesn't crash
          return new Response(
            '<html><body><p>Connecting to portal, please wait...</p><script>setTimeout(()=>location.reload(),2000)</script></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        })
    );
    return;
  }

  // ── CRITICAL: Never intercept captive portal OS probes ──
  if (isCaptiveProbe(url)) {
    console.log('[SW] Captive probe detected, bypassing cache:', url.hostname);
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // ── Strategy 1: Network-only for API calls ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch((error) => {
          console.error('[SW] API fetch failed:', error);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Network error. Please check your connection.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // ── Strategy 2: Cache-first for static assets ──
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', url.pathname);
            return cachedResponse;
          }

          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => {
                    console.log('[SW] Caching new resource:', url.pathname);
                    cache.put(request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error('[SW] Fetch failed for asset:', url.pathname, error);
              // Return a valid Response (not undefined) to avoid TypeError
              return new Response('Offline - Asset not available', { status: 503 });
            });
        })
    );
    return;
  }

  // ── Strategy 3: Network-first for HTML pages ──
  if (
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[SW] Network failed, serving cached HTML');
          return caches.match(request)
            .then((cachedResponse) => {
              // Always return a valid Response — never return undefined
              return cachedResponse || caches.match('/index.html') || new Response(
                '<html><body><p>You are offline. Please reconnect.</p></body></html>',
                { status: 200, headers: { 'Content-Type': 'text/html' } }
              );
            });
        })
    );
    return;
  }

  // ── Default: Network-first for everything else ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            // Always return a valid Response — never return undefined
            return cachedResponse || new Response('', { status: 503 });
          });
      })
  );
});

// ============================================================
// MESSAGES from clients
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// ============================================================
// ERROR HANDLING
// ============================================================
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
  // Prevent the error from propagating and crashing the SW
  event.preventDefault();
});

console.log('[SW] Service Worker loaded');