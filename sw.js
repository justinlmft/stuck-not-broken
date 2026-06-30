/* Service worker for the Stuck Not Broken app.
   SHELL: network-first (updates propagate; offline falls back to cache).
   AUDIO (/clips, /packs — now same-origin): cache-on-play, RANGE-AWARE, kept in a
   long-lived cache that survives shell updates. We fetch the full file once, cache it,
   and serve real 206 range slices from it — iOS media playback requires 206 responses,
   and cache-on-play keeps the footprint to only the practices actually played. */
const SHELL_VERSION = 'snb-app-shell-v108';
const AUDIO_CACHE = 'snb-audio-v1';

const SHELL = [
  './', './index.html', './app.css?v=27', './app.js?v=34', './icons.js', './current.js',
  './config.js', './store.js?v=27', './from-justin.js', './player.html',
  './manifest.webmanifest', './assets/logo/snb-mark-ink.svg'
];

const SCOPE_PATH = new URL(self.registration.scope).pathname;
const isAudio = (url) => /\/(clips|packs)\//.test(url.pathname);

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL_VERSION && k !== AUDIO_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function audioResponse(req, url) {
  const cache = await caches.open(AUDIO_CACHE);
  const key = new Request(url.origin + url.pathname);   // URL-only key (range/query ignored)
  let full = await cache.match(key);
  if (!full) {
    try {
      full = await fetch(url.origin + url.pathname);     // plain GET (no Range) -> 200 full, cacheable
      if (full && full.status === 200) await cache.put(key, full.clone());
    } catch (err) {
      const any = await cache.match(key);
      if (any) full = any; else return new Response('', { status: 504, statusText: 'offline, not cached' });
    }
  }
  const range = req.headers.get('range');
  if (!range) return full;
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
  if (url.origin !== location.origin) return;            // cross-origin: untouched
  if (isAudio(url)) { e.respondWith(audioResponse(req, url)); return; }   // audio: cache-on-play, range-aware
  if (!url.pathname.startsWith(SCOPE_PATH)) return;       // shell: in-scope only
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
