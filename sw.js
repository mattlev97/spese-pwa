// sw.js — Service Worker PWA Gestione Spese (ibrido cache+rete)
const CACHE_VERSION = 'v1.0.1'; // <-- Cambia questo per forzare aggiornamento
const STATIC_CACHE_NAME = `gestione-spese-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `gestione-spese-dynamic-${CACHE_VERSION}`;

// File statici principali
const STATIC_FILES = [
  '/',
  '/index.html',
  '/aggiungi.html',
  '/archivio.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// File dinamici o aggiuntivi
const DYNAMIC_FILES = [
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-384.png'
];

// Installazione Service Worker
self.addEventListener('install', event => {
  console.log('🔧 SW installazione...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)),
      caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.addAll(DYNAMIC_FILES))
    ]).then(() => self.skipWaiting())
  );
});

// Attivazione Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 SW attivazione...');
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME) {
            console.log('🗑️ Rimuovo cache vecchia:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategia di fetch
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Gestione HTML → cache-first + update in background
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(htmlCacheFirst(request));
    return;
  }

  // File statici → cache-first
  if (isStaticFile(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // File dinamici → cache-first
  if (isDynamicFile(request.url)) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE_NAME));
    return;
  }

  // Default → network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE_NAME));
});

// Funzioni helper
function isStaticFile(url) {
  return STATIC_FILES.some(file => url.endsWith(file));
}
function isDynamicFile(url) {
  return DYNAMIC_FILES.some(file => url.endsWith(file));
}

// Strategie
async function htmlCacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkFetch = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || networkFetch;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (networkResponse.ok) cache.put(request, networkResponse.clone());
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cache = await caches.open(cacheName);
    return await cache.match(request);
  }
}