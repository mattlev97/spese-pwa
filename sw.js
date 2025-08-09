const CACHE_NAME = "tracker-spese-v1";
const FILES = ["/","/index.html","/style.css","/script.js","/manifest.json","https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"];

self.addEventListener("install", evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("fetch", evt => {
  evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request)));
});
