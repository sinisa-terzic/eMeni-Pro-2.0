// js/service-worker.js

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
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Otvaranje keša');
                return cache.addAll(urlsToCache); // Keširaj resurse
            })
    );
});

// Interceptiranje zahteva
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request) // Proveri da li je resurs već keširan
            .then((response) => {
                if (response) {
                    return response; // Vrati keširanu verziju
                }
                return fetch(event.request); // U suprotnom, preuzmi sa servera
            })
    );
});