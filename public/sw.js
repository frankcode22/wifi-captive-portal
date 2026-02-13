// Service Worker for WiFi Portal - Optimized for Vite + MikroTik Hotspot
// v3 - Fixed: root path bypass, login fallback serves cached index.html
const CACHE_NAME = 'wifi-portal-v3';
const RUNTIME_CACHE = 'wifi-portal-runtime-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// ============================================================
// HOTSPOT DETECTION HELPERS
// ============================================================

/**
 * Returns true ONLY for explicit MikroTik hotspot login paths.
 * Does NOT include '/' — that must be served from cache so React loads.
 */
function isHotspotURL(url) {
  const hotspotPaths = ['/login', '/logout', '/status'];
  const isHotspotPath = hotspotPaths.includes(url.pathname);
  const hasHotspotParam = (
    url.searchParams.has('dst') ||
    url.searchParams.has('link-login') ||
    url.searchParams.has('link-orig') ||
    url.searchParams.has('link-logout')
  );
  return isHotspotPath || hasHotspotParam;
}

/**
 * Returns true for OS captive portal probe requests.
 * These must pass through without SW interference.
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
// INSTALL
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => console.error('[SW] Install failed:', error))
  );
});

// ============================================================
// ACTIVATE - clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== RUNTIME_CACHE)
          .map(n => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip non-http (chrome-extension etc.)
  if (!url.protocol.startsWith('http')) return;

  // 1. Hotspot login/redirect URLs
  // Try network first. If blocked (unauthenticated), serve cached index.html
  // so React Router can render the /login route.
  if (isHotspotURL(url)) {
    console.log('[SW] Hotspot URL, trying network:', url.pathname + url.search);
    event.respondWith(
      fetch(request)
        .catch(() => {
          console.log('[SW] Network blocked, serving index.html for React Router');
          return caches.match('/index.html')
            .then(cached => cached || new Response(
              '<html><body><p>Loading portal...</p>' +
              '<script>setTimeout(()=>location.reload(),1500)</script></body></html>',
              { status: 200, headers: { 'Content-Type': 'text/html' } }
            ));
        })
    );
    return;
  }

  // 2. OS captive portal probes - never intercept
  if (isCaptiveProbe(url)) {
    console.log('[SW] Captive probe, bypassing SW:', url.hostname);
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // 3. API calls - network only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ success: false, error: 'Network error.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // 4. Static assets (JS, CSS, images) - cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          console.log('[SW] Cache hit:', url.pathname);
          return cached;
        }
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('Asset unavailable', { status: 503 }));
      })
    );
    return;
  }

  // 5. HTML pages - network first, cached index.html fallback
  if (
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        console.log('[SW] HTML fetch failed, serving cache');
        return caches.match(request)
          .then(cached => cached || caches.match('/index.html'))
          .then(cached => cached || new Response(
            '<html><body><p>You are offline.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          ));
      })
    );
    return;
  }

  // 6. Default - network first, cache fallback
  event.respondWith(
    fetch(request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(request).then(cached => cached || new Response('', { status: 503 }))
    )
  );
});

// ============================================================
// MESSAGES
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'clearCache') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
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
  event.preventDefault();
});

console.log('[SW] Service Worker v3 loaded');