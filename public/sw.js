const CACHE_NAME = 'admin-dashboard-cache-v4';
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
        return Promise.all(
          PRECACHE_URLS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[SW] Failed to cache ${url}:`, err)
            )
          )
        );
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

// Fetch Event (Stale-While-Revalidate strategy)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    (async () => {
      try {
        // Try to fetch from network first
        const networkResponse = await fetch(event.request);
        console.log(`[SW] Network response for ${event.request.url}`);
        
        // Update cache in background
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Network failed - try cache
        console.log(`[SW] Network failed, trying cache for ${event.request.url}`);
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          console.log(`[SW] Serving from cache: ${event.request.url}`);
          return cachedResponse;
        }
        
        // For navigation requests, return offline page
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        
        return new Response('Offline', { 
          status: 503, 
          statusText: 'Service Unavailable' 
        });
      }
    })()
  );
});

// Background Sync Event
self.addEventListener('sync', (event) => {
  console.log(`[SW] Sync event: ${event.tag}`);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      handleSync().catch(error => {
        console.error('[SW] Sync failed:', error);
        return showNotification('Sync Failed', 'Could not sync data');
      })
    );
  }
});

self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    // Default notification content
    const defaultNotification = {
        title: 'New Update',
        body: 'You have new updates!',
        url: '/'
    };

    // Extract notification data safely
    let notificationData = { ...defaultNotification };
    let textData = '';

    try {
        // Try getting push message as text
        textData = event.data ? event.data.text() : '';
    } catch (e) {
        console.warn('[SW] Push data could not be read:', e);
    }

    if (textData.trim().startsWith('{') && textData.trim().endsWith('}')) {
        // If the push message is JSON, try parsing it
        try {
            notificationData = { ...defaultNotification, ...JSON.parse(textData) };
        } catch (e) {
            console.warn('[SW] Invalid JSON payload:', e);
            notificationData.body = textData || defaultNotification.body;
        }
    } else {
        // If it's plain text, set it as the body
        notificationData.body = textData || defaultNotification.body;
    }

    console.log('[SW] Showing notification:', notificationData);

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            data: { url: notificationData.url },
            vibrate: [200, 100, 200],
            icon: '/admin.png',  // Change to your notification icon
            badge: '/assets/react.svg', // Change to your small notification icon
            actions: [
                { action: 'open_url', title: 'Open' }
            ]
        }).catch(err => {
            console.error('[SW] Failed to show notification:', err);
        })
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received', event.notification);
    event.notification.close();

    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});


// Helper Functions
async function handleSync() {
  console.log('[SW] Starting sync...');
  const result = await syncData();
  await showNotification('Sync Complete', 'Data synchronized successfully');
  return result;
}

function syncData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('[SW] Mock sync completed');
      resolve({ status: 'success' });
    }, 2000);
  });
}

async function showNotification(title, body) {
  return self.registration.showNotification(title, { body });
}