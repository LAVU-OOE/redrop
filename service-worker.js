var CACHE_NAME = 'airdump-cache-v1.0';
var urlsToCache = [
  '/',
  '/styles.css',
  '/scripts/network.js',
  '/scripts/ui.js',
  '/sounds/blop.mp3',
  '/images/favicon-96x96.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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
  console.log('Updating Service Worker...')
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return true
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});