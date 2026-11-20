const CACHE_NAME = 'naciones-registro-automatizado-20261120-03';
const SHELL = [
  './', './index.html', './styles.css?v=registro-03', './config.js?v=registro-03',
  './app.js?v=registro-03', './manifest.webmanifest?v=registro-03',
  './assets/logo-mark-white.png?v=registro-03', './assets/icon-192.png', './assets/icon-512.png',
  './assets/favicon-16.png', './assets/favicon-32.png', './assets/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('naciones-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response && response.ok) cache.put(event.request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(event.request) || await cache.match('./index.html');
      if (cached) return cached;
      throw error;
    }
  })());
});
