const CACHE = 'ivo-rock-pwa-v2';
const CORE = [
  './','./index.html','./manifest.webmanifest','./mount.js','./pwa.js',
  './rock-tour-controls.js','./rock-tour-updates.css','./rock-tour-lose-sfx.js',
  './ivo-rock-start-menu.js','./ivo-rock-start-menu.css','./ivo-rock-polish.js','./ivo-rock-polish.css','./ivo-rock-results-v3.js','./ivo-rock-results-v3.css','./ivo-rock-stats.js','./ivo-rock-stats.css','./ivo-rock-fireworks.css',
  './assets/rolldown-runtime-S-ySWqyJ.js','./assets/framework-CXnKph_e.js','./assets/index-BKMDMKjr.css','./assets/cosmic-jump-DkePWGqE.js',
  './assets/rock-concert.webp','./assets/metal-wasteland.webp','./assets/metal-forge.webp','./assets/prism-cavern.png','./assets/metal-storm.webp','./assets/dawn-isles.png',
  './assets/lumi-atlas.webp','./assets/lumi-atlas.png','./assets/rock-hero.webp','./assets/rock-props.webp',
  './assets/ivo-roadie.png','./assets/ivo-speaker.png','./assets/ivo-turtle.png','./assets/ivo-crow.png',
  './audio/track1.mp3','./audio/track2.mp3','./audio/track3.mp3','./audio/track4.mp3','./audio/track5.mp3',
  './icons/ivo-rock-180.png','./icons/ivo-rock-192.png','./icons/ivo-rock-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(url => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('ivo-rock-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
const cleanKey = request => {
  const url = new URL(request.url);
  return new Request(url.origin + url.pathname, { method: 'GET', credentials: 'same-origin' });
};
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(new Request(new URL('./index.html', self.location).href), response.clone());
        return response;
      } catch {
        return (await cache.match(new Request(new URL('./index.html', self.location).href))) || (await cache.match(new Request(new URL('./', self.location).href)));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = cleanKey(request);
    const cached = await cache.match(key);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(key, response.clone());
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});