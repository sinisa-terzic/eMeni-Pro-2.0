const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/scripts/main.js',
    '/images/logo.png',
];

// Instalacija Service Workera
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Otvaranje keša');
            return Promise.all(
                urlsToCache.map((url) => {
                    return cache.add(url).catch((error) => {
                        console.error(`Failed to cache ${url}:`, error);
                    });
                })
            );
        })
    );
});

// Interceptiranje zahteva
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response; // Vrati keširanu verziju
            }
            return fetch(event.request); // U suprotnom, preuzmi sa servera
        })
    );
});