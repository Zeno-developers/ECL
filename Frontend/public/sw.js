const CACHE_NAME = 'elchurch-pwa-v2';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '::1'];
const IS_LOCAL_DEV = LOCAL_HOSTNAMES.includes(self.location.hostname);
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const ICON_ASSETS = [
  '/apple-touch-icon.png',
  '/images/logo.png',
  '/images/pwa-icon-192.svg',
  '/images/pwa-icon-512.svg',
  '/church-icon.svg'
];

const IMAGE_ASSETS = [
  '/images/churchhero1.png',
  '/images/churchhero14.jpg'
];

const OFFLINE_ASSETS = [
  ...CORE_ASSETS,
  ...ICON_ASSETS,
  ...IMAGE_ASSETS
];

const SKIP_FETCH_PATHS = [
  '/@vite/',
  '/@react-refresh',
  '/__vite_ping',
  '/sockjs-node',
  '/vite/hmr'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UNREGISTER') {
    console.log('SW: Received unregister message');
    self.registration.unregister();
  }
});

self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEV) {
    console.log('SW: Skipping install in dev mode');
    self.skipWaiting();
    self.registration.unregister();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEV) {
    console.log('SW: Skipping activate in dev mode');
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll())
        .then((clients) => clients.forEach((client) => client.navigate(client.url)))
    );
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEV) {
    console.log('SW: Skipping fetch in dev mode for:', event.request.url);
    return;
  }

  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (SKIP_FETCH_PATHS.some((path) => requestUrl.pathname.startsWith(path))) {
    return;
  }

  const offlineFallback = () => new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then((cached) => cached || caches.match('/'))
      )
    );
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() =>
            caches.match(event.request).then((fallback) =>
              fallback || caches.match('/index.html').then((indexFallback) => indexFallback || offlineFallback())
            )
          );
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || offlineFallback()))
  );
});
