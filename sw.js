const VERSION = 1;
const CACHE_NAME = 'ugwisha-sw-v' + VERSION, // change cache name to force update
urlsToCache = [
  './',
  './manifest.json',
  './css/content.css',
  './css/main.css',
  './css/periods.css',
  './js/main.js',
  './js/periods.js',
  './js/ripple.js',
  './js/schedules.js',
  './images/material-check_box.svg',
  './images/material-keyboard_arrow_left.svg',
  './images/material-keyboard_arrow_right.svg',
  './images/logo-192.png',
  './images/logo-512.png',
  './images/logo-ios.png',
  './images/temp-sheep.png',
  'https://fonts.googleapis.com/css?family=Roboto+Condensed',
  'https://fonts.gstatic.com/s/robotocondensed/v16/ieVl2ZhZI2eCN5jzbjEETS9weq8-19K7DQ.woff2'
];

function send(data) {
  self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage(data)));
}
function cacheImage(source, path) {
  fetch(source).then(res => {
    caches.open(CACHE_NAME).then(cache => {
      const deletePromise = cache.delete(new Request(path));
      // deletePromise.then(console.log);
      return deletePromise.then(() => cache.put(new Request(path), res));
    }).then(() => send({type: 'background-ok', path: path}));
  }).catch(err => {
    send({type: 'error', path: path});
  });
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(response => response || fetch(e.request)));
  send({type: 'version', version: VERSION});
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(names.map(cache => CACHE_NAME !== cache ? caches.delete(cache) : undefined))).then(() => self.clients.claim())); // BUG: images reset upon update
});
self.addEventListener('message', ({data}) => {
  switch (data.type) {
    case 'nature-image':
      cacheImage('https://source.unsplash.com/featured/1600x900/?nature', 'happy');
      break;
    case 'custom-image':
      cacheImage(data.url, 'fluffy');
      break;
  }
});
