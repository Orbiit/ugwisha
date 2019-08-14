const CACHE_NAME = 'ugwisha-sw-v1565754106218';
const EXTENSIONS_CACHE_NAME = 'ugwisha-extensions'; // don't change this
const urlsToCache = [
  './',
  './manifest.json',
  './css/ugwisha.css',
  './ugwisha.js',
  './js/gunn.js',
  './images/material/check_box.svg',
  './images/material/keyboard_arrow_left.svg',
  './images/material/keyboard_arrow_right.svg',
  './images/material/keyboard_arrow_up.svg',
  './images/material/keyboard_arrow_down.svg',
  './images/material/add.svg',
  './images/material/delete_outline.svg',
  './images/material/check.svg',
  './images/material/apps.svg',
  './images/material/settings.svg',
  './images/material/info.svg',
  './images/material/announcement.svg',
  './images/logo/192.png',
  './images/logo/512.png',
  './images/logo/ios.png',
  './images/sheep/left-sheep-curious.svg',
  './images/sheep/left-sheep-running-sad-D.svg',
  './images/sheep/left-sheep-standing-blowing-caterpillars.svg',
  './images/sheep/right-sheep-D-mouth.svg',
  './images/sheep/right-sheep-fishing.svg',
  './images/sheep/right-sheep-hot-air-balloon.svg',
  './images/sheep/right-sheep-sleeping.svg',
  './images/sheep/standing-sheep-arms-out.svg',
  './images/sheep/standing-sheep-classy.svg',
  './images/sheep/standing-sheep-doing-ballet.svg',
  './images/sheep/standing-sheep-flowers.svg',
  './images/sheep/standing-sheep-hungry.svg',
  './images/sheep/two-sheep-ice-cream.svg',
  './images/sheep/two-sheep-stack.svg',
  'https://fonts.googleapis.com/css?family=Open+Sans|Roboto+Condensed&display=swap',
  'https://fonts.gstatic.com/s/robotocondensed/v17/ieVl2ZhZI2eCN5jzbjEETS9weq8-19K7DQ.woff2',
  'https://fonts.gstatic.com/s/robotocondensed/v17/ieVl2ZhZI2eCN5jzbjEETS9weq8-19G7DRs5.woff2',
  'https://fonts.gstatic.com/s/opensans/v16/mem8YaGs126MiZpBA-UFVZ0b.woff2'
];
const isOnGithubPages = /https?:\/\/.+\.github\.io/;

function send(data) {
  self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage(data)));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).then(() => self.skipWaiting()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches
    .match(e.request, {ignoreSearch: isOnGithubPages.test(e.request.url)})
    .then(response => response || fetch(e.request)));

  // update cache if it's in the extension cache
  caches.open(EXTENSIONS_CACHE_NAME)
    .then(cache => cache.match(e.request)
      .then(response => response && cache.add(e.request)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    // remove old Ugwisha caches
    .then(names => Promise.all(names
      .map(cache => CACHE_NAME !== cache && cache.slice(0, 11) === 'ugwisha-sw-'
        ? caches.delete(cache)
        : null)))
    .then(() => self.clients.claim()));
});
