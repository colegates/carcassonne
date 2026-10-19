// Offline support: app files come from the network when it answers (falling back to
// the copy kept here), Google Fonts from the copy kept here.
const CACHE = 'carcassonne-v14';
const JS = ['main', 'game', 'tiles', 'art', 'layout', 'board', 'ai', 'rules', 'sound', 'ui', 'controller', 'lobby', 'net', 'expansions', 'pieces',
  'data/river', 'data/abbot', 'data/inns', 'data/traders', 'data/dragon', 'data/tower',
  'minis/assets', 'minis/catalog', 'minis/cache', 'minis/plan', 'minis/ground', 'minis/scene', 'minis/actors', 'minis/render'].map((f) => `js/${f}.js`);
// photographed UI materials (the home-screen video loop is left to the network: it is optional)
const UI = ['home-portrait', 'home-landscape', 'logo', 'desk', 'vellum', 'btn-red', 'btn-oak', 'btn-gold', 'boss-blue', 'boss-green', 'boss-iron',
  'ribbon', 'leather', 'dock-oak', 'table', 'tile-back-base', 'tile-back-river'].map((f) => `assets/ui/${f}.webp`);
const CORE = ['./', 'index.html', 'css/style.css', ...JS, ...UI, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // online rooms are always live
  if (e.request.headers.has('range')) return; // video byte ranges (iOS Safari) go straight to the network
  const own = url.origin === location.origin;
  const fonts = url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com');
  if (!own && !fonts) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: own });
    if (fonts && hit) return hit; // fonts never change
    // app files: the network first, so every phone in an online game runs the same
    // version; the copy kept here when offline (or when the network is very slow)
    const net = fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    });
    if (!hit) return net;
    const slow = new Promise((resolve) => { setTimeout(() => resolve(hit), 3500); });
    return Promise.race([net.catch(() => hit), slow]);
  }));
});
