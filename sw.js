// sw.js
const CACHE_NAME = 'spese-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/aggiungi.html',
    '/archivio.html',
    '/style.css',
    '/script.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
