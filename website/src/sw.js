// Raj Creation app (installed from Chrome or Safari): works offline.
// build.py fills in VERSION, CORE (pages, scripts, fonts, data) and PHOTOS (catalogue photos at phone size).
//
// - Pages and data (catalogue, rates, the Google Sheet prices): from the internet when there is a connection, saved
//   every time; without internet the last saved copy is used (the page then says it is offline).
// - Scripts, fonts and photos have a version in their link (?v=…), so a saved copy is always the right one.
// - The installed app saves all catalogue photos once in the background (about 7 MB); a website visitor only keeps
//   the photos they looked at. Big zoom photos are saved when opened.
// The secret rate-list link is never written in this file (anyone can read it): that page is saved once it is opened.
const VERSION = '__VERSION__';
const CORE = __CORE__;
const PHOTOS = __PHOTOS__;
const PAGES = 'rc-pages';             // pages and data, newest copy
const STATIC = 'rc-static';           // versioned files (scripts, fonts, photos)
const CORE_CACHE = 'rc-core-' + VERSION;
const OFFLINE = '/offline.html';
const STATIC_MAX = 900;               // about two sets of photos; the oldest are dropped first
const SHEET = /^https:\/\/docs\.google\.com\/spreadsheets\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE_CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rc-') && ![PAGES, STATIC, CORE_CACHE].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The installed app asks for every catalogue photo once per version (a few at a time, skipping ones already saved).
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'save-all') return;
  e.waitUntil((async () => {
    const meta = await caches.open(CORE_CACHE);
    if (await meta.match('/__photos-saved')) return;
    const c = await caches.open(STATIC);
    for (let i = 0; i < PHOTOS.length; i += 6) {
      await Promise.all(PHOTOS.slice(i, i + 6).map(async (u) => {
        if (await c.match(u)) return;
        try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch { /* offline again: try next time */ }
      }));
    }
    const missing = (await Promise.all(PHOTOS.map((u) => c.match(u)))).filter((r) => !r).length;
    if (!missing) await meta.put('/__photos-saved', new Response('1'));
    trim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                               // orders and logins always go to the internet
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') return e.respondWith(page(req));
    if (url.searchParams.has('v')) return e.respondWith(versioned(req));
    return e.respondWith(fresh(req));                             // data/*.json, rates.json, manifest …
  }
  if (SHEET.test(req.url)) return e.respondWith(fresh(req));     // live prices from the Google Sheet
});

// Pages: internet first (wait at most 4 s when a saved copy exists), then the saved copy, then the offline page.
async function page(req) {
  const cache = await caches.open(PAGES);
  const saved = (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
  const net = fetch(req).then((r) => { if (r.ok) cache.put(new URL(req.url).pathname, r.clone()); return r; });
  net.catch(() => {}); // answered from the saved copy: a late failure is fine
  try {
    return saved ? await Promise.race([net, timeout(4000)]) : await net;
  } catch {
    return saved || (await caches.match(OFFLINE)) || Response.error();
  }
}

// Data: internet first, saved copy when offline.
async function fresh(req) {
  const cache = await caches.open(PAGES);
  try {
    const r = await fetch(req);
    if (r.ok) cache.put(req, r.clone());
    return r;
  } catch {
    const saved = (await cache.match(req)) || (await caches.match(req));
    if (saved) return saved;
    throw new Error('offline');
  }
}

// Versioned files never change: saved copy first.
async function versioned(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) {
    const c = await caches.open(STATIC);
    c.put(req, r.clone()).then(trim);
  }
  return r;
}

const timeout = (ms) => new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms));

let trimming = false;
async function trim() {
  if (trimming) return;
  trimming = true;
  try {
    const c = await caches.open(STATIC);
    const keys = await c.keys();
    for (const k of keys.slice(0, Math.max(0, keys.length - STATIC_MAX))) await c.delete(k);
  } finally { trimming = false; }
}
