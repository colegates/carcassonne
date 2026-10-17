// Offline support: stale-while-revalidate for app files and Google Fonts.
const CACHE = 'carcassonne-v5';
const JS = ['main', 'game', 'tiles', 'art', 'layout', 'board', 'ai', 'rules', 'sound', 'ui', 'controller', 'lobby', 'net', 'expansions',
  'data/river', 'data/abbot', 'data/inns', 'data/traders', 'data/dragon', 'data/tower'].map((f) => `js/${f}.js`);
const CORE = ['./', 'index.html', 'css/style.css', ...JS, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const cacheable = url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com');
  if (!cacheable) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: url.origin === location.origin });
    const net = fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
