// JDISIM 서비스워커 — 정적 자산 캐시 (오프라인에서도 티켓/지갑 열림)
const CACHE = 'jdisim-v1';
const CORE = ['/mobile.html', '/issue.html', '/romi-bot.js', '/images/fox-hello.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/') || e.request.url.includes('open-meteo')) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
