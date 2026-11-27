/* Offline support. Bump VERSION whenever any cached file changes. */
const VERSION = 'zc-v10';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/qrcode.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
// Mission maps (Mission tab). Fetched one by one so a missing file can't break the install.
const OPTIONAL = Array.from({ length: 11 }, (_, i) => './maps/m' + String(i).padStart(2, '0') + '.jpg');

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL).then(() => Promise.allSettled(OPTIONAL.map(u => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Pages: try the network so updates show up, fall back to the cached copy offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { if (!res.ok) return res; const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else: cache first, then network (and keep a copy for next time offline).
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
