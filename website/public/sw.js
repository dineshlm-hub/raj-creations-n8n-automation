// Raj Creation app (installed from Chrome or Safari): works offline.
// build.py fills in VERSION, CORE (pages, scripts, fonts, data) and PHOTOS (catalogue photos at phone size).
//
// - Pages and data (catalogue, rates, the Google Sheet prices): from the internet when there is a connection, saved
//   every time; without internet the last saved copy is used (the page then says it is offline).
// - Scripts, fonts and photos have a version in their link (?v=…), so a saved copy is always the right one.
// - The installed app saves all catalogue photos once in the background (about 7 MB); a website visitor only keeps
//   the photos they looked at. Big zoom photos are saved when opened.
// The secret rate-list link is never written in this file (anyone can read it): that page is saved once it is opened.
const VERSION = "d49e2ebf";
const CORE = ["/", "/clutchers/", "/scrunchies/", "/tie-bow/", "/offline.html", "/data/catalogue.json", "/assets/app.js?v=569541bb", "/assets/i18n.js?v=2eaa369d", "/assets/logo-mark.webp?v=5810593f", "/assets/fonts/inter-latin.woff2?v=260c81a4", "/assets/fonts/inter-rupee.woff2?v=ac6327ed", "/assets/fonts/playfair-latin.woff2?v=ef05b30d", "/manifest.webmanifest?v=ea872e00", "/assets/apple-touch-icon.png?v=878c86a7", "/assets/nav-clutchers.webp?v=b300c565", "/assets/nav-scrunchies.webp?v=0cf896f9", "/assets/nav-tie-bow.webp?v=f064641f"];
const PHOTOS = ["/img/clutchers/1-s.webp?v=2e7166e8", "/img/clutchers/1-t.webp?v=3275c734", "/img/clutchers/2-s.webp?v=b9205d14", "/img/clutchers/2-t.webp?v=eb81775a", "/img/clutchers/x-ch-01-s.webp?v=c5972357", "/img/clutchers/x-ch-01-t.webp?v=d8ededb8", "/img/clutchers/3-s.webp?v=62d7e1c9", "/img/clutchers/3-t.webp?v=d59e1cf5", "/img/clutchers/4-s.webp?v=a1743c3a", "/img/clutchers/4-t.webp?v=37100705", "/img/clutchers/5-s.webp?v=53ec0364", "/img/clutchers/5-t.webp?v=0647747b", "/img/clutchers/6-s.webp?v=066b946a", "/img/clutchers/6-t.webp?v=eac2e655", "/img/clutchers/7-s.webp?v=4e584c89", "/img/clutchers/7-t.webp?v=29fbb714", "/img/clutchers/8-s.webp?v=d7752591", "/img/clutchers/8-t.webp?v=45e88dc5", "/img/clutchers/9-s.webp?v=1652c3a8", "/img/clutchers/9-t.webp?v=3afb8ec5", "/img/clutchers/10-s.webp?v=cc8a44cb", "/img/clutchers/10-t.webp?v=a25048cd", "/img/clutchers/11-s.webp?v=c733733d", "/img/clutchers/11-t.webp?v=6fe488b4", "/img/clutchers/12-s.webp?v=7e11f37d", "/img/clutchers/12-t.webp?v=dbbe5c9a", "/img/clutchers/13-s.webp?v=f35cfea9", "/img/clutchers/13-t.webp?v=79396df6", "/img/clutchers/14-s.webp?v=135bb400", "/img/clutchers/14-t.webp?v=12ecc042", "/img/clutchers/15-s.webp?v=329b5335", "/img/clutchers/15-t.webp?v=7ffc5c5a", "/img/clutchers/16-s.webp?v=d977cf19", "/img/clutchers/16-t.webp?v=aa8f355b", "/img/clutchers/17-s.webp?v=8edb74f3", "/img/clutchers/17-t.webp?v=4fff243b", "/img/clutchers/18-s.webp?v=a9385cd6", "/img/clutchers/18-t.webp?v=c397828b", "/img/clutchers/19-s.webp?v=a6e39bc3", "/img/clutchers/19-t.webp?v=65d07f63", "/img/clutchers/20-s.webp?v=1b0d5ca8", "/img/clutchers/20-t.webp?v=0a67c3ee", "/img/clutchers/21-s.webp?v=73cea046", "/img/clutchers/21-t.webp?v=cc0a6296", "/img/clutchers/22-s.webp?v=cd8ef4e4", "/img/clutchers/22-t.webp?v=52827d42", "/img/clutchers/23-s.webp?v=1aee6738", "/img/clutchers/23-t.webp?v=fe77c683", "/img/clutchers/24-s.webp?v=1d964956", "/img/clutchers/24-t.webp?v=0b966135", "/img/clutchers/25-s.webp?v=eef5500d", "/img/clutchers/25-t.webp?v=76b23beb", "/img/clutchers/26-s.webp?v=15ab554c", "/img/clutchers/26-t.webp?v=e548aeb1", "/img/clutchers/27-s.webp?v=fda4b5c5", "/img/clutchers/27-t.webp?v=3e18ed67", "/img/clutchers/x-ch-50-s.webp?v=111b93bf", "/img/clutchers/x-ch-50-t.webp?v=30e025d4", "/img/scrunchies/1-s.webp?v=6d7045d5", "/img/scrunchies/1-t.webp?v=244af898", "/img/scrunchies/2-s.webp?v=85311d34", "/img/scrunchies/2-t.webp?v=bf95063b", "/img/scrunchies/3-s.webp?v=6732e4ae", "/img/scrunchies/3-t.webp?v=03ae4d6d", "/img/scrunchies/4-s.webp?v=bf8f1705", "/img/scrunchies/4-t.webp?v=6c012c29", "/img/scrunchies/5-s.webp?v=d4a0093b", "/img/scrunchies/5-t.webp?v=a78e100a", "/img/scrunchies/6-s.webp?v=a7f4cdb7", "/img/scrunchies/6-t.webp?v=2441ec24", "/img/scrunchies/x-931-s.webp?v=5032d1ad", "/img/scrunchies/x-931-t.webp?v=bedf323e", "/img/scrunchies/7-s.webp?v=6ac03590", "/img/scrunchies/7-t.webp?v=2881dc4e", "/img/scrunchies/8-s.webp?v=0c62b7e7", "/img/scrunchies/8-t.webp?v=8ae3cdc9", "/img/scrunchies/9-s.webp?v=aeecdac7", "/img/scrunchies/9-t.webp?v=593e5948", "/img/scrunchies/x-986-s.webp?v=163ac9d2", "/img/scrunchies/x-986-t.webp?v=02a5b328", "/img/scrunchies/10-s.webp?v=26c34756", "/img/scrunchies/10-t.webp?v=4fba5c50", "/img/scrunchies/11-s.webp?v=20f754bc", "/img/scrunchies/11-t.webp?v=08bd23f9", "/img/scrunchies/12-s.webp?v=b9f8e6c4", "/img/scrunchies/12-t.webp?v=9e11a75d", "/img/scrunchies/13-s.webp?v=98c2b63e", "/img/scrunchies/13-t.webp?v=f0c665e1", "/img/scrunchies/14-s.webp?v=7a8e39d2", "/img/scrunchies/14-t.webp?v=68898295", "/img/scrunchies/15-s.webp?v=397267d2", "/img/scrunchies/15-t.webp?v=4e2082c1", "/img/scrunchies/16-s.webp?v=58647bb1", "/img/scrunchies/16-t.webp?v=11b2a9f5", "/img/scrunchies/17-s.webp?v=7cc42e87", "/img/scrunchies/17-t.webp?v=000f6e1f", "/img/scrunchies/18-s.webp?v=71c7cfa7", "/img/scrunchies/18-t.webp?v=29e5b57d", "/img/scrunchies/19-s.webp?v=de0cfebc", "/img/scrunchies/19-t.webp?v=6cf127af", "/img/scrunchies/20-s.webp?v=0bd21cd5", "/img/scrunchies/20-t.webp?v=4745f276", "/img/scrunchies/21-s.webp?v=0dbdb08f", "/img/scrunchies/21-t.webp?v=65236ee8", "/img/scrunchies/22-s.webp?v=ca91dcf5", "/img/scrunchies/22-t.webp?v=b072c0ab", "/img/scrunchies/23-s.webp?v=57e9ddae", "/img/scrunchies/23-t.webp?v=df6d0a3e", "/img/scrunchies/24-s.webp?v=d7a87c64", "/img/scrunchies/24-t.webp?v=ff3b608f", "/img/scrunchies/25-s.webp?v=c30e2c73", "/img/scrunchies/25-t.webp?v=b2aabf1f", "/img/scrunchies/26-s.webp?v=6e10119e", "/img/scrunchies/26-t.webp?v=24349835", "/img/scrunchies/27-s.webp?v=c775ba76", "/img/scrunchies/27-t.webp?v=c361c399", "/img/scrunchies/28-s.webp?v=377e5f0d", "/img/scrunchies/28-t.webp?v=e7313a74", "/img/scrunchies/29-s.webp?v=fe8ff856", "/img/scrunchies/29-t.webp?v=e18e04fc", "/img/scrunchies/30-s.webp?v=42f74c0b", "/img/scrunchies/30-t.webp?v=5d22d047", "/img/scrunchies/31-s.webp?v=5ac48572", "/img/scrunchies/31-t.webp?v=f568d903", "/img/scrunchies/32-s.webp?v=32463332", "/img/scrunchies/32-t.webp?v=f520bec3", "/img/scrunchies/33-s.webp?v=3a14d120", "/img/scrunchies/33-t.webp?v=421b0f41", "/img/scrunchies/34-s.webp?v=057d95fc", "/img/scrunchies/34-t.webp?v=114e4ea0", "/img/scrunchies/35-s.webp?v=578b2790", "/img/scrunchies/35-t.webp?v=23f0ac1a", "/img/scrunchies/36-s.webp?v=983542f4", "/img/scrunchies/36-t.webp?v=f4e22b6c", "/img/scrunchies/37-s.webp?v=bd4d3955", "/img/scrunchies/37-t.webp?v=30693ede", "/img/scrunchies/38-s.webp?v=21376749", "/img/scrunchies/38-t.webp?v=f482c4ce", "/img/scrunchies/39-s.webp?v=70e5e9e8", "/img/scrunchies/39-t.webp?v=e8a12234", "/img/scrunchies/40-s.webp?v=8d307ad8", "/img/scrunchies/40-t.webp?v=4c359f98", "/img/scrunchies/41-s.webp?v=7a208157", "/img/scrunchies/41-t.webp?v=4527a6ad", "/img/scrunchies/42-s.webp?v=d448ba52", "/img/scrunchies/42-t.webp?v=109fe43c", "/img/scrunchies/43-s.webp?v=d6faca5c", "/img/scrunchies/43-t.webp?v=cf956746", "/img/scrunchies/44-s.webp?v=3b884513", "/img/scrunchies/44-t.webp?v=bf7b2155", "/img/scrunchies/45-s.webp?v=6508e60f", "/img/scrunchies/45-t.webp?v=35a6b5a2", "/img/scrunchies/46-s.webp?v=5965e613", "/img/scrunchies/46-t.webp?v=c07228f0", "/img/scrunchies/x-rj-1002-s.webp?v=1e608822", "/img/scrunchies/x-rj-1002-t.webp?v=bc521da9", "/img/scrunchies/47-s.webp?v=d0a0d94f", "/img/scrunchies/47-t.webp?v=0524621c", "/img/scrunchies/48-s.webp?v=e93afe6a", "/img/scrunchies/48-t.webp?v=d308af1c", "/img/scrunchies/49-s.webp?v=67d02b46", "/img/scrunchies/49-t.webp?v=7f908f71", "/img/scrunchies/50-s.webp?v=332440b0", "/img/scrunchies/50-t.webp?v=46796249", "/img/scrunchies/51-s.webp?v=c15d6412", "/img/scrunchies/51-t.webp?v=a93bb517", "/img/scrunchies/52-s.webp?v=28f51edc", "/img/scrunchies/52-t.webp?v=2c8a827e", "/img/scrunchies/53-s.webp?v=00767853", "/img/scrunchies/53-t.webp?v=43b87b04", "/img/scrunchies/54-s.webp?v=18ca347a", "/img/scrunchies/54-t.webp?v=c7cd0311", "/img/scrunchies/55-s.webp?v=d123f4b9", "/img/scrunchies/55-t.webp?v=69e61d6b", "/img/scrunchies/56-s.webp?v=c41853b2", "/img/scrunchies/56-t.webp?v=d3a1013f", "/img/scrunchies/57-s.webp?v=592810e8", "/img/scrunchies/57-t.webp?v=7a9430b6", "/img/scrunchies/58-s.webp?v=11002018", "/img/scrunchies/58-t.webp?v=599c97d4", "/img/scrunchies/x-rj-1009-s.webp?v=cc6a63e8", "/img/scrunchies/x-rj-1009-t.webp?v=b73feaa3", "/img/scrunchies/x-1105-s.webp?v=fb7c19fb", "/img/scrunchies/x-1105-t.webp?v=e9df8921", "/img/scrunchies/x-1111-s.webp?v=d09ceec6", "/img/scrunchies/x-1111-t.webp?v=dcebf84d", "/img/scrunchies/x-1111-2-s.webp?v=b2ce6e89", "/img/scrunchies/x-1111-2-t.webp?v=4807167c", "/img/scrunchies/x-1125-s.webp?v=470b1e0d", "/img/scrunchies/x-1125-t.webp?v=7a5027f7", "/img/scrunchies/x-1126-s.webp?v=146b48b9", "/img/scrunchies/x-1126-t.webp?v=0461d376", "/img/scrunchies/x-1127-s.webp?v=76d3611c", "/img/scrunchies/x-1127-t.webp?v=a16e3998", "/img/scrunchies/x-340-s.webp?v=a71909fe", "/img/scrunchies/x-340-t.webp?v=2146d929", "/img/scrunchies/x-439-s.webp?v=4b1c01d5", "/img/scrunchies/x-439-t.webp?v=aa69f99c", "/img/scrunchies/x-845-s.webp?v=3c81eab4", "/img/scrunchies/x-845-t.webp?v=19b38bf8", "/img/scrunchies/x-935-s.webp?v=86fb6ad9", "/img/scrunchies/x-935-t.webp?v=2947cfec", "/img/scrunchies/x-rt-616-s.webp?v=0c8a4016", "/img/scrunchies/x-rt-616-t.webp?v=30d1d49f", "/img/tie-bow/1-s.webp?v=08fae64c", "/img/tie-bow/1-t.webp?v=bc14bf61", "/img/tie-bow/2-s.webp?v=7fd7c981", "/img/tie-bow/2-t.webp?v=64121334", "/img/tie-bow/3-s.webp?v=851dbf41", "/img/tie-bow/3-t.webp?v=e868c0b3", "/img/tie-bow/5-s.webp?v=a43d05ab", "/img/tie-bow/5-t.webp?v=15335119", "/img/tie-bow/6-s.webp?v=1bd10f3b", "/img/tie-bow/6-t.webp?v=ddfc7a47", "/img/tie-bow/7-s.webp?v=42c5003b", "/img/tie-bow/7-t.webp?v=e93f8356", "/img/tie-bow/9-s.webp?v=39ba437a", "/img/tie-bow/9-t.webp?v=ea5a184a", "/img/tie-bow/10-s.webp?v=3162bff5", "/img/tie-bow/10-t.webp?v=83e488a2", "/img/tie-bow/11-s.webp?v=19bdbaa1", "/img/tie-bow/11-t.webp?v=4629e329", "/img/tie-bow/12-s.webp?v=dfd3a054", "/img/tie-bow/12-t.webp?v=ebac0f60", "/img/tie-bow/13-s.webp?v=5abf7564", "/img/tie-bow/13-t.webp?v=b89cd677", "/img/tie-bow/14-s.webp?v=1a20a27d", "/img/tie-bow/14-t.webp?v=064b11af", "/img/tie-bow/15-s.webp?v=44aeff0a", "/img/tie-bow/15-t.webp?v=2186d84a", "/img/tie-bow/16-s.webp?v=f8850a62", "/img/tie-bow/16-t.webp?v=87b74382", "/img/tie-bow/17-s.webp?v=d3b7be70", "/img/tie-bow/17-t.webp?v=48f3911b", "/img/tie-bow/18-s.webp?v=e3e13e91", "/img/tie-bow/18-t.webp?v=c282abe5", "/img/tie-bow/19-s.webp?v=34c4b539", "/img/tie-bow/19-t.webp?v=c431aacb", "/img/tie-bow/20-s.webp?v=01fe8ad1", "/img/tie-bow/20-t.webp?v=ec7509cb"];
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
  const job = (async () => {
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
  })();
  if (e.waitUntil) e.waitUntil(job); // older Safari: no waitUntil here, the download still runs (and resumes next time)
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
