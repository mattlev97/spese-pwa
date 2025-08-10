// Service Worker per PWA Gestione Spese
const CACHE_NAME = ‘gestione-spese-v1.0.0’;
const STATIC_CACHE_NAME = ‘gestione-spese-static-v1.0.0’;

// File da cacheare per il funzionamento offline
const STATIC_FILES = [
‘/’,
‘/index.html’,
‘/aggiungi.html’,
‘/archivio.html’,
‘/style.css’,
‘/app.js’,
‘/manifest.json’,
‘/icon-192.png’,
‘/icon-512.png’
];

// File dinamici che potrebbero essere richiesti
const DYNAMIC_FILES = [
‘/icon-72.png’,
‘/icon-96.png’,
‘/icon-128.png’,
‘/icon-144.png’,
‘/icon-152.png’,
‘/icon-384.png’
];

// Installazione del Service Worker
self.addEventListener(‘install’, (event) => {
console.log(‘🔧 Service Worker: Installazione in corso…’);

event.waitUntil(
Promise.all([
// Cache dei file statici
caches.open(STATIC_CACHE_NAME).then((cache) => {
console.log(‘📦 Caching file statici…’);
return cache.addAll(STATIC_FILES);
}),
// Pre-cache file dinamici (opzionale)
caches.open(CACHE_NAME).then((cache) => {
console.log(‘📦 Pre-caching file dinamici…’);
return cache.addAll(DYNAMIC_FILES).catch(err => {
console.warn(‘⚠️ Alcuni file dinamici non sono disponibili:’, err);
});
})
]).then(() => {
console.log(‘✅ Service Worker: Installazione completata’);
// Forza l’attivazione del nuovo service worker
return self.skipWaiting();
}).catch(error => {
console.error(‘❌ Errore durante l'installazione:’, error);
})
);
});

// Attivazione del Service Worker
self.addEventListener(‘activate’, (event) => {
console.log(‘🚀 Service Worker: Attivazione in corso…’);

event.waitUntil(
Promise.all([
// Rimuovi cache obsolete
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.map((cacheName) => {
if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
console.log(‘🗑️ Rimozione cache obsoleta:’, cacheName);
return caches.delete(cacheName);
}
})
);
}),
// Prendi controllo di tutte le pagine
self.clients.claim()
]).then(() => {
console.log(‘✅ Service Worker: Attivazione completata’);
}).catch(error => {
console.error(‘❌ Errore durante l'attivazione:’, error);
})
);
});

// Intercettazione delle richieste di rete
self.addEventListener(‘fetch’, (event) => {
const request = event.request;
const url = new URL(request.url);

// Ignora richieste non HTTP/HTTPS
if (!url.protocol.startsWith(‘http’)) {
return;
}

// Ignora richieste POST/PUT/DELETE (per localStorage)
if (request.method !== ‘GET’) {
return;
}

event.respondWith(handleFetchRequest(request));
});

// Gestione delle richieste di rete con strategia Cache First per file statici
async function handleFetchRequest(request) {
const url = new URL(request.url);
const pathname = url.pathname;

try {
// Strategia Cache First per file statici dell’app
if (isAppStaticFile(pathname)) {
return await cacheFirstStrategy(request, STATIC_CACHE_NAME);
}

```
// Strategia Cache First per risorse dell'app
if (isAppResource(pathname)) {
  return await cacheFirstStrategy(request, CACHE_NAME);
}

// Strategia Network First per tutto il resto
return await networkFirstStrategy(request);
```

} catch (error) {
console.error(‘❌ Errore nella gestione della richiesta:’, error);

```
// Fallback per pagine HTML
if (request.headers.get('accept')?.includes('text/html')) {
  const cachedResponse = await caches.match('/index.html');
  if (cachedResponse) {
    return cachedResponse;
  }
}

// Risposta di errore generica
return new Response('App non disponibile offline', {
  status: 503,
  statusText: 'Service Unavailable'
});
```

}
}

// Verifica se il file è statico dell’app
function isAppStaticFile(pathname) {
const staticFiles = [’/’, ‘/index.html’, ‘/aggiungi.html’, ‘/archivio.html’, ‘/style.css’, ‘/app.js’, ‘/manifest.json’];
return staticFiles.includes(pathname) || pathname.endsWith(’.html’) || pathname.endsWith(’.css’) || pathname.endsWith(’.js’);
}

// Verifica se è una risorsa dell’app
function isAppResource(pathname) {
return pathname.startsWith(’/icon-’) ||
pathname.endsWith(’.png’) ||
pathname.endsWith(’.jpg’) ||
pathname.endsWith(’.svg’) ||
pathname.endsWith(’.webp’);
}

// Strategia Cache First
async function cacheFirstStrategy(request, cacheName) {
try {
// Prova prima dalla cache
const cache = await caches.open(cacheName);
const cachedResponse = await cache.match(request);

```
if (cachedResponse) {
  console.log('📦 Servito dalla cache:', request.url);
  
  // Aggiorna la cache in background se la risorsa è datata
  if (shouldUpdateCache(cachedResponse)) {
    updateCacheInBackground(request, cache);
  }
  
  return cachedResponse;
}

// Se non è in cache, scarica dalla rete
console.log('🌐 Scaricamento dalla rete:', request.url);
const networkResponse = await fetch(request);

// Salva in cache se la risposta è valida
if (networkResponse.ok) {
  const responseClone = networkResponse.clone();
  await cache.put(request, responseClone);
  console.log('💾 Salvato in cache:', request.url);
}

return networkResponse;
```

} catch (error) {
console.error(‘❌ Cache First fallita:’, error);
throw error;
}
}

// Strategia Network First
async function networkFirstStrategy(request) {
try {
// Prova prima la rete
console.log(‘🌐 Tentativo rete:’, request.url);
const networkResponse = await fetch(request);

```
// Salva in cache se la risposta è valida
if (networkResponse.ok) {
  const cache = await caches.open(CACHE_NAME);
  const responseClone = networkResponse.clone();
  await cache.put(request, responseClone);
  console.log('💾 Salvato in cache:', request.url);
}

return networkResponse;
```

} catch (error) {
// Fallback alla cache se la rete fallisce
console.log(‘📦 Fallback alla cache per:’, request.url);
const cachedResponse = await caches.match(request);

```
if (cachedResponse) {
  return cachedResponse;
}

throw error;
```

}
}

// Verifica se la risorsa in cache dovrebbe essere aggiornata
function shouldUpdateCache(cachedResponse) {
const cacheDate = new Date(cachedResponse.headers.get(‘date’) || 0);
const now = new Date();
const oneHour = 60 * 60 * 1000;

return (now - cacheDate) > oneHour;
}

// Aggiorna la cache in background
async function updateCacheInBackground(request, cache) {
try {
const networkResponse = await fetch(request);
if (networkResponse.ok) {
await cache.put(request, networkResponse.clone());
console.log(‘🔄 Cache aggiornata in background:’, request.url);
}
} catch (error) {
console.warn(‘⚠️ Aggiornamento cache fallito:’, error);
}
}

// Gestione messaggi dal client
self.addEventListener(‘message’, (event) => {
const { type, data } = event.data;

switch (type) {
case ‘SKIP_WAITING’:
console.log(‘⏭️ Skip waiting richiesto’);
self.skipWaiting();
break;

```
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
```

}
});

// Ottieni stato della cache
async function getCacheStatus() {
try {
const cacheNames = await caches.keys();
const cacheStats = {};

```
for (const name of cacheNames) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  cacheStats[name] = keys.length;
}

return {
  caches: cacheStats,
  totalCaches: cacheNames.length
};
```

} catch (error) {
console.error(‘❌ Errore nel ottenere stato cache:’, error);
return null;
}
}

// Pulisci tutta la cache
async function clearCache() {
try {
const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(name => caches.delete(name)));
console.log(‘🗑️ Tutte le cache sono state pulite’);
return true;
} catch (error) {
console.error(‘❌ Errore nella pulizia cache:’, error);
return false;
}
}

// Gestione errori globali del Service Worker
self.addEventListener(‘error’, (event) => {
console.error(‘❌ Errore Service Worker:’, event.error);
});

self.addEventListener(‘unhandledrejection’, (event) => {
console.error(‘❌ Promise rifiutata nel Service Worker:’, event.reason);
});

console.log(‘🚀 Service Worker caricato e pronto!’);