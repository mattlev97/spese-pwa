// sw.js — Service Worker per PWA Gestione Spese

const CACHE_NAME = 'gestione-spese-v1.0.0';
const STATIC_CACHE_NAME = 'gestione-spese-static-v1.0.0';

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

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installazione in corso…');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Caching file statici…');
        return cache.addAll(STATIC_FILES);
      }),
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 Pre-caching file dinamici…');
        return cache.addAll(DYNAMIC_FILES).catch(err => {
          console.warn('⚠️ Alcuni file dinamici non sono disponibili:', err);
        });
      })
    ]).then(() => {
      console.log('✅ Service Worker: Installazione completata');
      return self.skipWaiting();
    }).catch(error => {
      console.error('❌ Errore durante l\'installazione:', error);
    })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Attivazione in corso…');

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('🗑️ Rimozione cache obsoleta:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Attivazione completata');
    }).catch(error => {
      console.error('❌ Errore durante l\'attivazione:', error);
    })
  );
});

// Intercettazione richieste di rete
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;
  if (request.method !== 'GET') return;

  event.respondWith(handleFetchRequest(request));
});

async function handleFetchRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    if (isAppStaticFile(pathname)) {
      return await cacheFirstStrategy(request, STATIC_CACHE_NAME);
    }
    if (isAppResource(pathname)) {
      return await cacheFirstStrategy(request, CACHE_NAME);
    }
    return await networkFirstStrategy(request);
  } catch (error) {
    console.error('❌ Errore nella gestione della richiesta:', error);

    if (request.headers.get('accept')?.includes('text/html')) {
      const cachedResponse = await caches.match('/index.html');
      if (cachedResponse) return cachedResponse;
    }

    return new Response('App non disponibile offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

function isAppStaticFile(pathname) {
  const staticFiles = ['/', '/index.html', '/aggiungi.html', '/archivio.html', '/style.css', '/app.js', '/manifest.json'];
  return staticFiles.includes(pathname) || pathname.endsWith('.html') || pathname.endsWith('.css') || pathname.endsWith('.js');
}

function isAppResource(pathname) {
  return pathname.startsWith('/icon-') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp');
}

async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('📦 Servito dalla cache:', request.url);
      if (shouldUpdateCache(cachedResponse)) {
        updateCacheInBackground(request, cache);
      }
      return cachedResponse;
    }

    console.log('🌐 Scaricamento dalla rete:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('💾 Salvato in cache:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Cache First fallita:', error);
    throw error;
  }
}

async function networkFirstStrategy(request) {
  try {
    console.log('🌐 Tentativo rete:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      console.log('💾 Salvato in cache:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log('📦 Fallback alla cache per:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

function shouldUpdateCache(cachedResponse) {
  const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
  const now = new Date();
  return (now - cacheDate) > (60 * 60 * 1000);
}

async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('🔄 Cache aggiornata in background:', request.url);
    }
  } catch (error) {
    console.warn('⚠️ Aggiornamento cache fallito:', error);
  }
}

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  const { type } = event.data;
  switch (type) {
    case 'SKIP_WAITING':
      console.log('⏭️ Skip waiting richiesto');
      self.skipWaiting();
      break;
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
      });
      break;
    case 'CLEAR_CACHE':
      clearCache().then(success => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED', data: success });
      });
      break;
    default:
      console.warn('⚠️ Messaggio sconosciuto:', type);
  }
});

async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const cacheStats = {};
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      cacheStats[name] = keys.length;
    }
    return { caches: cacheStats, totalCaches: cacheNames.length };
  } catch (error) {
    console.error('❌ Errore nel ottenere stato cache:', error);
    return null;
  }
}

async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ Tutte le cache sono state pulite');
    return true;
  } catch (error) {
    console.error('❌ Errore nella pulizia cache:', error);
    return false;
  }
}

self.addEventListener('error', (event) => {
  console.error('❌ Errore Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rifiutata nel Service Worker:', event.reason);
});

console.log('🚀 Service Worker caricato e pronto!');