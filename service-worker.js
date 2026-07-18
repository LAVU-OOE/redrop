const CACHE_NAME = 'airdump-cache-v1.0';
const urlsToCache = [
  './',
  './styles.css',
  './manifest.json',
  './scripts/network.js',
  './scripts/ui.js',
  './scripts/localization.js',
  './lang/en.json',
  './lang/de.json',
  './sounds/blop.mp3',
  './images/favicon-96x96.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Force activation
        return self.skipWaiting();
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Updating Service Worker...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete only caches that belong to this app (start with 'airdump-cache-')
          if (cacheName.startsWith('airdump-cache-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});