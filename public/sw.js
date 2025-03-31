const CACHE_NAME = 'admin-dashboard-cache-v3';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/admin.png',
  '/assets/react.svg',
  OFFLINE_URL
];


// Install Event
self.addEventListener('install', (event) => {
  console.log('[SW] Install event triggered');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened');
        return cache.addAll([
          '/',
          '/index.html',
          OFFLINE_URL
        ]);
      })
      .then(() => {
        console.log('[SW] Pre-caching complete');
        return self.skipWaiting();
      })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event triggered');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch Event (Network first, then cache)
self.addEventListener('fetch', (event) => {
  console.log(`[SW] Fetching: ${event.request.url}`);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        console.log(`[SW] Network response for ${event.request.url}`);
        
        // Cache the response if valid
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log(`[SW] Caching response for ${event.request.url}`);
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(async error => {
        console.log(`[SW] Network failed for ${event.request.url}, trying cache...`);
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log(`[SW] Serving from cache: ${event.request.url}`);
          return cachedResponse;
        }
        console.log(`[SW] No cache available for ${event.request.url}`);
        return caches.match(OFFLINE_URL);
      })
  );
});

// Background Sync Event
self.addEventListener('sync', (event) => {
  console.log(`[SW] Sync event triggered: ${event.tag}`);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      syncData().then(result => {
        console.log('[SW] Sync completed:', result);
        // Show notification when sync completes
        self.registration.showNotification('Data Synced', {
          body: 'Your data has been synchronized',
          vibrate: [200, 100, 200]
        });
      }).catch(error => {
        console.error('[SW] Sync failed:', error);
      })
    );
  }
});

// Push Notification Event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data?.json() || {
    title: 'New Update',
    body: 'There are new updates available!',
    url: '/'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url }
    }).then(() => {
      console.log('[SW] Notification shown');
    })
  );
});

// Example sync function (mock implementation)
function syncData() {
  console.log('[SW] Starting data sync...');
  // This would be your actual sync logic
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('[SW] Mock sync operation completed');
      resolve('Sync successful');
    }, 2000);
  });
}