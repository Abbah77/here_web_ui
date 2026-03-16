const CACHE_NAME = 'here-cache-v1';
const DYNAMIC_CACHE = 'here-dynamic-v1';
const API_CACHE = 'here-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/themes/dark.css',
    '/js/app.js',
    '/js/router.js',
    '/js/utils/constants.js',
    '/js/utils/helpers.js',
    '/js/utils/animations.js',
    '/js/store/index.js',
    '/assets/splash/logo.png',
    '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE && cache !== API_CACHE) {
                        console.log('Service Worker: Clearing old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - cache with network fallback
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests differently
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(request));
        return;
    }

    // Handle static assets
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(networkResponse => {
                        // Cache dynamic assets
                        if (request.method === 'GET') {
                            const responseToCache = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => {
                                    cache.put(request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Handle API requests with offline queue
async function handleAPIRequest(request) {
    try {
        // Try network first for API
        const networkResponse = await fetch(request);
        
        // Cache successful GET responses
        if (request.method === 'GET' && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE)
                .then(cache => {
                    cache.put(request, responseToCache);
                });
        }
        
        return networkResponse;
    } catch (error) {
        // If offline, return cached GET responses
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // For POST/PUT requests, queue them for later
        if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
            return queueOfflineRequest(request);
        }
        
        return new Response(JSON.stringify({ 
            error: 'offline', 
            message: 'You are offline' 
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Queue offline mutations
async function queueOfflineRequest(request) {
    try {
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Array.from(request.headers.entries()),
            body: await request.clone().text(),
            timestamp: Date.now()
        };

        // Store in IndexedDB via message to client
        const allClients = await self.clients.matchAll();
        allClients.forEach(client => {
            client.postMessage({
                type: 'QUEUE_OFFLINE_REQUEST',
                data: requestData
            });
        });

        // Return optimistic response
        return new Response(JSON.stringify({ 
            queued: true, 
            message: 'Request queued for offline sync' 
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error queueing request:', error);
        return new Response(JSON.stringify({ 
            error: 'failed_to_queue',
            message: 'Failed to queue request' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
    
    if (event.tag === 'sync-posts') {
        event.waitUntil(syncPosts());
    }
    
    if (event.tag === 'sync-all') {
        event.waitUntil(syncAll());
    }
});

async function syncMessages() {
    console.log('Syncing messages...');
    // This will be implemented when we build the sync service
}

async function syncPosts() {
    console.log('Syncing posts...');
    // This will be implemented when we build the sync service
}

async function syncAll() {
    console.log('Syncing all data...');
    // This will be implemented when we build the sync service
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    
    let data = { title: 'HERE', body: 'New notification', icon: '/assets/icons/icon-192.png' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/assets/icons/icon-192.png',
        badge: '/assets/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: data,
        actions: [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message from client
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});