// Raj Creation app (installed from Chrome): makes the site installable and shows a small page when there is no internet.
// Pages, photos and prices always come from the website (nothing else is cached), so the app never shows old prices.
const CACHE = 'rc-offline-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return; // everything except page loads goes straight to the network
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
