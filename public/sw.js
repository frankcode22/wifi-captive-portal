// Service Worker for WiFi Portal - v4 - MAC Address Preservation Fix
const CACHE_NAME = 'wifi-portal-v4';
const RUNTIME_CACHE = 'wifi-portal-runtime-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// ============================================================
// HOTSPOT DETECTION HELPERS
// ============================================================

/**
 * Returns true ONLY for explicit MikroTik hotspot login paths.
 */
function isHotspotURL(url) {
  const hotspotPaths = ['/login', '/logout', '/status'];
  const isHotspotPath = hotspotPaths.includes(url.pathname);
  const hasHotspotParam = (
    url.searchParams.has('dst') ||
    url.searchParams.has('link-login') ||
    url.searchParams.has('link-orig') ||
    url.searchParams.has('link-logout') ||
    url.searchParams.has('mac') ||
    url.searchParams.has('id') ||
    url.searchParams.has('client-mac-address')
  );
  return isHotspotPath || hasHotspotParam;
}

/**
 * Returns true for OS captive portal probe requests.
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
  console.log('[SW] Installing v4...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => console.error('[SW] Install failed:', error))
  );
});

// ============================================================
// ACTIVATE
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v4...');
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

  // Skip non-http
  if (!url.protocol.startsWith('http')) return;

  // Log all requests with query params for debugging
  if (url.search) {
    console.log('[SW] Request with params:', url.pathname + url.search);
  }

  // 1. Hotspot login/redirect URLs - PRESERVE QUERY PARAMS
  if (isHotspotURL(url)) {
    console.log('[SW] Hotspot URL detected:', url.pathname + url.search);
    event.respondWith(
      fetch(request)
        .catch(() => {
          console.log('[SW] Network blocked, serving index.html WITH preserved params');
          // ✅ KEY FIX: Preserve query parameters in the fallback
          return caches.match('/index.html')
            .then(cached => {
              if (cached) {
                // Clone the response and modify it to preserve params
                return cached.clone();
              }
              // Fallback HTML that preserves query params
              return new Response(
                `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading WiFi Portal...</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
                border-radius: 50%; width: 40px; height: 40px; 
                animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h2>Loading WiFi Portal...</h2>
  <div class="spinner"></div>
  <p id="status">Initializing...</p>
  <script>
    console.log('🔍 [SW Fallback] Current URL:', window.location.href);
    console.log('🔍 [SW Fallback] Search params:', window.location.search);
    
    // Extract MAC address from URL
    const urlParams = new URLSearchParams(window.location.search);
    const mac = urlParams.get('mac') || urlParams.get('id') || urlParams.get('client-mac-address') || 'Not found';
    console.log('🔍 [SW Fallback] MAC Address:', mac);
    
    document.getElementById('status').textContent = 'MAC: ' + mac;
    
    // Reload after 1.5 seconds to allow SW to activate
    setTimeout(() => {
      console.log('🔄 [SW Fallback] Reloading with preserved params...');
      window.location.reload();
    }, 1500);
  </script>
</body>
</html>`,
                { 
                  status: 200, 
                  headers: { 
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                  } 
                }
              );
            });
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
    console.log('[SW] API call, bypassing cache:', url.pathname);
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('[SW] API call failed:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Network error - check API connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 4. Static assets - cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          console.log('[SW] Cache hit:', url.pathname);
          return cached;
        }
        console.log('[SW] Cache miss, fetching:', url.pathname);
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

  // 5. HTML pages - network first, cached fallback
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

  // 6. Default - network first
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
  console.log('[SW] Message received:', event.data);
  
  if (event.data === 'skipWaiting') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    console.log('[SW] Clearing all caches...');
    event.waitUntil(
      caches.keys().then(names => {
        console.log('[SW] Deleting caches:', names);
        return Promise.all(names.map(n => caches.delete(n)));
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
  event.preventDefault();
});

console.log('[SW] Service Worker v4 loaded - MAC address preservation enabled');