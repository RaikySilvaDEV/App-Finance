/* Only public installation resources are cached. Never cache the app HTML,
 * API responses, OAuth callbacks, bank files, credentials or financial data.
 * Bump VERSION when changing any of these public resources. */
const VERSION = 'finpulse-pwa-v1';
const PUBLIC_FILES = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(PUBLIC_FILES.map((url) => new Request(url, { cache: 'reload', credentials: 'omit' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('finpulse-pwa-') && key !== VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || /^\/api(?:\/|$)/.test(url.pathname)) return;
  // Only the static, public offline page is used when navigation fails. A live
  // authenticated document is deliberately never written into Cache Storage.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () => {
      const cache = await caches.open(VERSION);
      return await cache.match('/offline.html') || new Response('FinPulse sem conexão. Tente novamente quando estiver online.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  if (!url.search && PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      return await cache.match(url.pathname) || fetch(request);
    })());
  }
});
