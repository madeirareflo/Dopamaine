const CACHE = 'prisma-shell-v8';
const SHELL = [
  './', './index.html', './styles.css', './js/app.js', './js/audio.js',
  './js/retention.js', './js/achievements.js', './js/challenges.js', './js/crystal.js',
  './js/streak.js', './js/horizon.js', './js/impact.js',
  './js/rhythm.js', './js/session-events.js', './js/collectibles.js', './js/loadouts.js',
  './js/world-map.js', './js/frenzy.js', './js/shop.js', './js/particles.js', './manifest.webmanifest', './icons/icon.svg',
  './icons/icon-192.png', './icons/icon-512.png',
];
const urls = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map(path => new Request(path, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('prisma-shell-') && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const key = new URL(url.pathname, url.origin).href;
  if (request.method !== 'GET' || !urls.has(key)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response.ok && !response.redirected) {
        await cache.put(key, response.clone()).catch(() => {});
        return response;
      }
      return (await cache.match(key)) ?? response;
    } catch {
      return (await cache.match(key)) ?? Response.error();
    }
  })());
});
