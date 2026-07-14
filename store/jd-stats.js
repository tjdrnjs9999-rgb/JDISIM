/* ============================================================
   JDISIM 실측 지표 배지 v0 — "약속 대신 실측을 판다"
   /api/jdios/stats(공개 GET)를 읽어 정적 약속 문구를 실측 수치로 승격.
   · 실패/표본 미달 시: 아무것도 하지 않음 (기존 문구 그대로 — 조용한 폴백)
   · 세션당 1회 fetch (sessionStorage 캐시 30분)
   · 소비처: [data-jd-stat="issue"] 티켓 문구, app.js 모달 스트립(window.JD_STATS),
             mobile 보텀시트 개통 안내(window.JD_STATS)
   ============================================================ */
(function () {
  'use strict';
  var API = 'https://jdisim-proxy.vercel.app/api/jdios/stats';
  var CACHE_KEY = 'jd_stats_v0';
  var CACHE_MIN = 30;

  function fmtMin(m) {
    if (m == null) return '';
    if (m < 60) return Math.round(m) + '분';
    var h = Math.floor(m / 60), r = Math.round(m % 60);
    return h + '시간' + (r ? ' ' + r + '분' : '');
  }

  function apply(stats) {
    if (!stats) return;
    window.JD_STATS = stats; // app.js 모달 스트립·mobile 개통 안내가 렌더 시 참조
    var iss = stats.issue;
    if (iss && iss.p50_min != null) {
      // 개런티 티켓 1행: "결제 후 평균 5~15분 QR 발송" → 실측 승격
      document.querySelectorAll('[data-jd-stat="issue"]').forEach(function (el) {
        el.textContent = '결제 후 실측 평균 ' + fmtMin(iss.p50_min) + ' QR 발송';
        var sub = el.parentNode && el.parentNode.querySelector('span');
        if (sub) sub.textContent = '최근 ' + iss.n + '건 실측 ✓ · 카카오톡·문자 자동 전송';
      });
    }
  }
  window.JD_STATS_APPLY = apply; // 테스트·지연 렌더용

  function fromCache() {
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.t < CACHE_MIN * 60000) return c.stats;
    } catch (e) {}
    return null;
  }

  var cached = fromCache();
  if (cached) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(cached); });
    else apply(cached);
    return;
  }
  fetch(API).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.ok || !j.stats) return;
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), stats: j.stats })); } catch (e) {}
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(j.stats); });
    else apply(j.stats);
  }).catch(function () { /* 조용한 폴백 — 기존 문구 유지 */ });
})();
