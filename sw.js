self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('flappy-pepe-v1').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/css/main.css',
                '/css/game.css',
                '/js/main.js',
                '/assets/logo.png',
                '/assets/background.jpg'
            ]);
        })
    );
});
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});