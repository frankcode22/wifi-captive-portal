// Service Worker for WiFi Portal - v5 - Handle MikroTik Login Flow
const CACHE_NAME = 'wifi-portal-v5';
const RUNTIME_CACHE = 'wifi-portal-runtime-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// ============================================================
// HOTSPOT DETECTION HELPERS
// ============================================================

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
    url.searchParams.has('username') ||
    url.searchParams.has('client-mac-address')
  );
  return isHotspotPath || hasHotspotParam;
}

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
  console.log('[SW] Installing v5...');
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
  console.log('[SW] Activating v5...');
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

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Log all requests with params
  if (url.search) {
    console.log('[SW] Request with params:', url.pathname + url.search);
  }

  // 1. Hotspot URLs - Try network, fallback to cached index
  if (isHotspotURL(url)) {
    console.log('[SW] Hotspot URL detected:', url.pathname + url.search);
    
    event.respondWith(
      fetch(request)
        .then(response => {
          console.log('[SW] Network response received:', response.status);
          return response;
        })
        .catch(error => {
          console.log('[SW] Network blocked, serving index.html:', error.message);
          
          // Try to extract MAC from referrer or use placeholder
          return caches.match('/index.html')
            .then(cached => {
              if (cached) {
                return cached.clone();
              }
              
              // Fallback HTML
              return new Response(
                `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WiFi Portal Loading...</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      text-align: center; 
      padding: 50px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container { max-width: 500px; margin: 0 auto; background: white; 
                 color: #333; padding: 40px; border-radius: 20px; 
                 box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; 
                border-radius: 50%; width: 50px; height: 50px; 
                animation: spin 1s linear infinite; margin: 30px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .info { background: #f0f4ff; padding: 15px; border-radius: 10px; 
            margin: 20px 0; font-size: 14px; text-align: left; }
    .info strong { color: #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🌐 Loading WiFi Portal</h2>
    <div class="spinner"></div>
    <p>Please wait while we set up your connection...</p>
    <div class="info">
      <strong>Connection Details:</strong><br>
      <span id="details">Detecting device...</span>
    </div>
  </div>
  <script>
    console.log('🔍 [Fallback] URL:', window.location.href);
    console.log('🔍 [Fallback] Params:', window.location.search);
    
    const params = new URLSearchParams(window.location.search);
    const mac = params.get('mac') || params.get('id') || params.get('username') || 'Detecting...';
    const dst = params.get('dst') || params.get('link-orig') || 'Unknown';
    
    document.getElementById('details').innerHTML = 
      'MAC: ' + mac + '<br>' +
      'Redirect: ' + (dst.length > 50 ? dst.substring(0, 50) + '...' : dst);
    
    console.log('🔍 [Fallback] MAC:', mac);
    
    // Reload after brief delay to let SW activate
    setTimeout(() => {
      console.log('🔄 [Fallback] Reloading...');
      window.location.reload();
    }, 2000);
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

  // 2. Captive portal probes
  if (isCaptiveProbe(url)) {
    console.log('[SW] Captive probe, bypassing:', url.hostname);
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // 3. API calls - CRITICAL: Check if backend is reachable
  if (url.pathname.startsWith('/api/')) {
    console.log('[SW] API call to:', url.href);
    
    event.respondWith(
      fetch(request)
        .then(response => {
          console.log('[SW] API response:', response.status, url.pathname);
          return response;
        })
        .catch(error => {
          console.error('[SW] API call failed:', error);
          console.error('[SW] Failed URL:', url.href);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Cannot connect to backend server',
              details: error.message,
              url: url.href
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

  // 5. HTML pages
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
        return caches.match(request)
          .then(cached => cached || caches.match('/index.html'))
          .then(cached => cached || new Response(
            '<html><body><p>Offline</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          ));
      })
    );
    return;
  }

  // 6. Default
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

console.log('[SW] Service Worker v5 loaded - Enhanced error logging');