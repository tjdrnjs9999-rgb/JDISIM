// JDISIM 서비스워커 v2 — 앱 셸 프리캐시 + 전략별 캐싱
// 배포 시 VERSION만 올리면 이전 캐시 자동 정리
const VERSION = 'jdisim-v2';
const PRECACHE = [
  '/mobile.html', '/issue.html', '/index.html',
  '/jdisim-app.js', '/romi-bot.js', '/products-lite.js',
  '/manifest.webmanifest',
  '/images/icon-192.png', '/images/icon-512.png',
  '/images/fox-hello.png', '/images/fox-qr.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return;              // 외부(API/CDN)는 통과
  if (url.pathname.startsWith('/api/')) return;            // API는 항상 네트워크

  // 1) 페이지 이동: 네트워크 우선 → 캐시 → mobile.html 폴백 (오프라인에서도 앱이 뜸)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { put(req, r.clone()); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('/mobile.html')))
    );
    return;
  }

  // 2) 대용량 카탈로그(products.js): 캐시 우선 + 백그라운드 갱신 → 재방문 즉시 로딩
  if (url.pathname.endsWith('/products.js')) {
    e.respondWith(
      caches.match(req).then(cached => {
        const refresh = fetch(req).then(r => { put(req, r.clone()); return r; }).catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  // 3) 나머지 정적 자산: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const refresh = fetch(req).then(r => { put(req, r.clone()); return r; }).catch(() => cached);
      return cached || refresh;
    })
  );
});

function put(req, res) {
  if (!res || res.status !== 200) return;
  caches.open(VERSION).then(c => c.put(req, res)).catch(() => {});
}
