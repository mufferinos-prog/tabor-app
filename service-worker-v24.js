const CACHE='camp-helper-v24';
const ASSETS=['./','./index.html','./styles.v24.css','./app.v24.js','./manifest.webmanifest?v=24','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url); if(url.origin===location.origin){ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); }});
