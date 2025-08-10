const CACHE_NAME = "spesa-cache-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./aggiungi.html",
  "./archivio.html",
  "./style.css",
  "./aggiungi.js",
  "./archivio.js",
  "./dashboard.js"
];

// Installazione del service worker e cache iniziale
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Attivazione e pulizia cache vecchia
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// Recupero file dalla cache o dalla rete
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((res) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      );
    })
  );
});
