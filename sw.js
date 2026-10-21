/* BRACHIUM service worker
   Network-first: when you're online it always fetches the newest files from GitHub
   (and refreshes its saved copy); when you're offline it serves the saved copy.
   That's why updates show up on the next launch without reinstalling. */
const CACHE = 'brachium-cache';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();                       // new version takes over immediately
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app's own files: try the network first, fall back to the saved copy offline
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(req.url, { cache: 'no-cache' })   // skip the browser's short-term cache so updates appear promptly
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Fonts: saved after the first load so the look survives offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }))
    );
  }
  // Everything else (the Sheet) goes straight to the network; the app keeps its own offline copy
});
