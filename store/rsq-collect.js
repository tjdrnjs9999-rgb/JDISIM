/* ============================================================
   ROMI RSQ 수집기 v1 (rsq-collect.js) — JDISIM 독자기술 ②
   실사용자의 익명 망품질 샘플을 수집해 국가×망 실측 품질지수를 만든다.
   개인정보 0: 전화번호·이름·위치권한·식별자 일절 미수집.

   사용 (issue.html — 케어링크는 국가/SKU를 알고 있음):
     <script src="rsq-collect.js" defer></script>
     <script>RomiRSQ.init({ country: '일본', sku: 'JDJ_일본도코모IIJ_...' });</script>

   동작:
   - 해외 판정: 기기 타임존 ≠ Asia/Seoul (국내 테스트 오염 방지)
   - navigator.connection(다운링크/유효망) + /api/rsq?ping 실측 RTT
   - 세션당 첫 샘플 즉시, 이후 10분 간격, 하루 최대 12건 (localStorage 캡)
   - 전송: sendBeacon (페이지 이탈에도 유실 없음)
   ============================================================ */
(function () {
  'use strict';
  var API = (window.CARE_API ? window.CARE_API.replace('/api/esim', '/api/rsq')
                             : 'https://jdisim-proxy.vercel.app/api/rsq');
  var CAP_KEY = 'rsq_day';           // 'YYYY-MM-DD|count'
  var INTERVAL = 10 * 60 * 1000;     // 10분
  var DAY_MAX = 12;
  var ctx = null, timer = null;

  function abroad() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Asia/Seoul'; }
    catch (e) { return false; }
  }
  function underCap() {
    var today = new Date().toISOString().slice(0, 10);
    var v = (localStorage.getItem(CAP_KEY) || '').split('|');
    var n = (v[0] === today) ? parseInt(v[1], 10) || 0 : 0;
    if (n >= DAY_MAX) return false;
    localStorage.setItem(CAP_KEY, today + '|' + (n + 1));
    return true;
  }
  function measureRtt() {
    var t0 = performance.now();
    return fetch(API + '?ping=1', { cache: 'no-store' })
      .then(function () { return Math.round(performance.now() - t0); })
      .catch(function () { return 0; });
  }
  function sample() {
    if (!navigator.onLine || !abroad() || !underCap()) return;
    var conn = navigator.connection || {};
    measureRtt().then(function (rtt) {
      var body = JSON.stringify({
        c: ctx.country || '',
        sku: ctx.sku || '',
        net: conn.effectiveType || '4g',
        dl: conn.downlink || 0,
        rtt: rtt,
        os: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android'
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
      }
    });
  }

  window.RomiRSQ = {
    init: function (o) {
      ctx = o || {};
      if (!ctx.country) return;                 // 국가 모르면 수집 안 함
      sample();                                 // 첫 샘플
      clearInterval(timer);
      timer = setInterval(sample, INTERVAL);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') sample();   // 복귀 시 1회
      });
    },
    /* 상품페이지 뱃지: RomiRSQ.badge('일본', el) → "실측 품질 87 · 표본 214건" */
    badge: function (country, el) {
      fetch(API + '?c=' + encodeURIComponent(country))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ready) return;
          el.textContent = '실측 품질 ' + j.qi + '점 · 여행자 ' + j.n + '명 실측';
          el.style.display = '';
        }).catch(function () {});
    }
  };
})();
