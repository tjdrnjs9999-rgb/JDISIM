// JDISIM 서비스워커 v1 — 재방문 속도 개선 + 오프라인 기본 화면
const CACHE = 'jdisim-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 전략: 네트워크 우선(항상 최신), 실패 시 캐시 (오프라인 대비)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;         // 외부(CDN·API)는 관여 안 함
  if (url.pathname.endsWith('.env')) return;           // 설정 파일은 캐시 금지
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
