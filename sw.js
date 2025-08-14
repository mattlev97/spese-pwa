// sw.js — Service Worker per PWA Gestione Spese

// Incrementa la versione ad ogni release
const CACHE_NAME = 'gestione-spese-v1.0.1';
const STATIC_CACHE_NAME = 'gestione-spese-static-v1.0.1';

// File statici da cacheare per funzionamento offline
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

// File dinamici che potrebbero essere richiesti
const DYNAMIC_FILES = [
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-384.png'
];

// Installazione: cache iniziale
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installazione…');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)),
      caches.open(CACHE_NAME).then(cache => cache.addAll(DYNAMIC_FILES).catch(err => {
        console.warn('⚠️ File dinamici mancanti:', err);
      }))
    ]).then(() => {
      console.log('✅ SW: Installazione completata');
      return self.skipWaiting(); // attiva subito
    })
  );
});

// Attivazione: elimina cache vecchie
self.addEventListener('activate', (event) => {
  console.log('🚀 SW: Attivazione…');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME && name !== STATIC_CACHE_NAME) {
            console.log('🗑️ Elimino cache:', name);
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim()) // applica subito
  );
});

// Fetch: preferisci sempre la rete, aggiorna cache in background
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // aggiorna cache in background
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // fallback cache
  );
});

// Messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('⏭️ Skip waiting richiesto');
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker pronto!');