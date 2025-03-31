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

// Install Event - Precaches essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return Promise.all(
          PRECACHE_URLS.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              return null;
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] Pre-caching complete');
        return self.skipWaiting();
      })
  );
});

// Activate Event - Cleans up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
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

// Fetch Event - Network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-HTTP requests and chrome-extension requests
  if (!event.request.url.startsWith('http') || 
      event.request.url.includes('chrome-extension')) {
    return;
  }

  // Skip POST requests and other non-GET methods
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache))
            .catch(err => console.warn('[SW] Cache put error:', err));
        }
        return networkResponse;
      })
      .catch(async (fetchError) => {
        console.log('[SW] Network failed, serving from cache:', fetchError);
        
        // For navigation requests, return the offline page
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL) || 
                 new Response('<h1>Offline</h1><p>You are offline.</p>', {
                   headers: {'Content-Type': 'text/html'}
                 });
        }
        
        // For other requests, try cache
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || 
               new Response('', {status: 503, statusText: 'Service Unavailable'});
      })
  );
});

// Background Sync Event - Enhanced with error handling
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    console.log('[SW] Background sync triggered:', event.tag);
    event.waitUntil(
      syncCart().catch(err => {
        console.error('[SW] Sync failed:', err);
        // You could register another sync here if needed
      })
    );
  }
});

// Push Notification Event - With default fallbacks
self.addEventListener('push', (event) => {
  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'New Update',
      body: 'There are new updates available!',
      url: '/'
    };
  }

  const options = {
    body: notificationData.body || 'You have new updates',
    data: {
      url: notificationData.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Admin Dashboard',
      options
    )
  );
});

// Notification Click Event - Enhanced with client matching
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});

// Example sync function (implement your actual logic)
async function syncCart() {
  // Your actual sync implementation would go here
  console.log('[SW] Performing cart sync...');
  // return await yourSyncFunction();
}