const CACHE_NAME = 'naciones-qr-exacto-20261120-01';
const SHELL = [
  './', './index.html', './styles.css?v=exacto-01', './config.js?v=exacto-01',
  './app.js?v=exacto-01', './manifest.webmanifest?v=exacto-01',
  './assets/logo-mark-white.png?v=exacto-01', './assets/icon-192.png?v=exacto-01',
  './assets/icon-512.png?v=exacto-01'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('naciones-qr-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(request) || await cache.match('./index.html');
      if (cached) return cached;
      throw error;
    }
  })());
});
