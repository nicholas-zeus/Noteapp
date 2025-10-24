// service-worker.js — no-cache version
self.addEventListener('install', (evt) => {
  // Immediately activate new version
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  // Take control of open pages immediately
  evt.waitUntil(clients.claim());
});

self.addEventListener('fetch', (evt) => {
  // Always bypass cache and fetch from network
  evt.respondWith(fetch(evt.request).catch(() => fetch(evt.request)));
});
