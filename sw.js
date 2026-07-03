/* Service worker for the Stuck Not Broken app.
   SHELL: network-first (updates propagate; offline falls back to cache).
   AUDIO (/clips, /packs — same-origin): cache-on-play + optional bulk precache, RANGE-AWARE,
   kept in a long-lived cache that survives shell updates. We fetch the full file once, cache it
   (best-effort — quota never breaks playback), and serve real 206 range slices from it (iOS
   media playback requires 206). The "save all practices for offline" toggle posts PRECACHE_AUDIO
   to bulk-fill the same cache with progress + quota reporting. */
const SHELL_VERSION = 'snb-app-shell-v152';
const AUDIO_CACHE = 'snb-audio-v1';

const SHELL = [
  './', './index.html', './app.css?v=52', './app.js?v=60', './icons.js', './current.js',
  './config.js', './store.js?v=41', './from-justin.js', './player.html',
  './manifest.webmanifest', './offline-manifest.json', './assets/logo/snb-mark-ink.svg'
];

const SCOPE_PATH = new URL(self.registration.scope).pathname;
const isAudio = (url) => /\/(clips|packs)\//.test(url.pathname);

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (d.type === 'PRECACHE_AUDIO') { e.waitUntil(precacheAudio(d.urls || [], e.source)); return; }
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL_VERSION && k !== AUDIO_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// bulk precache for the offline toggle — explicit quota handling + progress
async function precacheAudio(urls, client) {
  const cache = await caches.open(AUDIO_CACHE);
  const total = urls.length;
  let done = 0, saved = 0, quota = false, i = 0;
  const post = (type) => { try { client && client.postMessage({ type, done, total, saved, quota }); } catch (e) {} };
  async function worker() {
    while (i < urls.length && !quota) {
      const u = urls[i++];
      try {
        if (await cache.match(u)) { saved++; }
        else {
          const res = await fetch(u);
          if (res && res.status === 200) { await cache.put(u, res.clone()); saved++; }
        }
      } catch (err) {
        if (err && (err.name === 'QuotaExceededError' || /quota|exceeded/i.test(String((err && err.message) || err)))) quota = true;
        // else: transient network error on one clip — skip, keep going
      }
      done++; post('PRECACHE_PROGRESS');
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  post('PRECACHE_DONE');
}

// audio: serve cache-first, range-aware; cache best-effort so quota never breaks playback
async function audioResponse(req, url) {
  const cache = await caches.open(AUDIO_CACHE);
  const key = new Request(url.origin + url.pathname);
  let full = await cache.match(key);
  if (!full) {
    let net;
    try { net = await fetch(url.origin + url.pathname); }
    catch (err) { return new Response('', { status: 504, statusText: 'offline, not cached' }); }
    if (net && net.status === 200) { try { await cache.put(key, net.clone()); } catch (e) {} }
    full = net;
  }
  const range = req.headers.get('range');
  if (!range || !full || full.status !== 200) return full;
  const buf = await full.clone().arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : size - 1;
  if (isNaN(start) || start < 0 || start >= size) start = 0;
  if (isNaN(end) || end >= size) end = size - 1;
  const body = buf.slice(start, end + 1);
  return new Response(body, {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
    },
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (isAudio(url)) { e.respondWith(audioResponse(req, url)); return; }
  if (!url.pathname.startsWith(SCOPE_PATH)) return;
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) { const c = await caches.open(SHELL_VERSION); c.put(req, fresh.clone()); }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') { const idx = await caches.match('./index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
