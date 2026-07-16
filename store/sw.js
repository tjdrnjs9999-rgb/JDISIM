// JDISIM 서비스워커 v2 — HTML은 항상 최신(네트워크 강제 재검증), 정적 자산은 네트워크 우선 + 오프라인 캐시
const CACHE = 'jdisim-v2';
const CORE = ['/mobile.html', '/issue.html', '/romi-bot.js', '/images/fox-hello.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))) // 구버전 캐시(v1) 전부 삭제
      .then(() => self.clients.claim()) // 열려 있는 탭도 즉시 새 SW가 제어
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/') || e.request.url.includes('open-meteo')) return;

  const isHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // [핵심 수정] HTML은 브라우저 HTTP 캐시를 건너뛰고 서버에 항상 재검증 —
    // 배포 직후에도 구버전 페이지가 보이던 문제의 원인 제거. 오프라인일 때만 캐시 폴백.
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 정적 자산: 네트워크 우선, 실패 시(오프라인) 캐시 폴백 — 기존 동작 유지
  e.respondWith(
    fetch(e.request)
      .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request))
  );
});
