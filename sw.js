const CACHE_NAME = 'ugwisha-sw-v1554338628590';
const BACKGROUND_CACHE_NAME = 'ugwisha-backgrounds'; // don't change this
const EXTENSIONS_CACHE_NAME = 'ugwisha-extensions'; // don't change this either
const urlsToCache = [
  './',
  './manifest.json',
  './css/content.css',
  './css/main.css',
  './css/periods.css',
  './ugwisha.js',
  './images/material-check_box.svg',
  './images/material-keyboard_arrow_left.svg',
  './images/material-keyboard_arrow_right.svg',
  './images/material-keyboard_arrow_up.svg',
  './images/material-apps.svg',
  './images/logo-192.png',
  './images/logo-512.png',
  './images/logo-ios.png',
  './images/logo-paly-192.png',
  './images/logo-paly-512.png',
  './images/logo-paly-ios.png',
  './images/temp-sheep.png',
  'https://fonts.googleapis.com/css?family=Roboto+Condensed',
  'https://fonts.gstatic.com/s/robotocondensed/v16/ieVl2ZhZI2eCN5jzbjEETS9weq8-19K7DQ.woff2'
];

function send(data) {
  self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage(data)));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).then(() => self.skipWaiting()));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(response => response || fetch(e.request)));
  caches.open(EXTENSIONS_CACHE_NAME) // update cache if it's in the extension cache
    .then(cache => cache.match(e.request)
      .then(response => response && cache.add(e.request)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(names.map(cache => CACHE_NAME !== cache && BACKGROUND_CACHE_NAME !== cache && EXTENSIONS_CACHE_NAME !== cache ? caches.delete(cache) : undefined))).then(() => self.clients.claim()));
});
