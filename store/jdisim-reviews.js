/* ============================================================
   JDISIM 자체 후기 위젯 v1.0
   - issue.html 후기 수집 장치(POST /api/review)로 모인 후기를
     메인·상품·가이드 어디든 노출하는 드롭인 위젯
   - 사용법:
       <script src="jdisim-reviews.js" defer></script>
       <div data-jdisim-reviews="strip"></div>                 ← 메인용 가로 스트립
       <div data-jdisim-reviews="panel"></div>                 ← 상품 영역용 패널(평점 요약+리스트)
       <div data-jdisim-reviews="panel" data-country="일본"></div>  ← 국가 필터
   - 후기 0건이면 컨테이너 자체를 숨김 (빈 껍데기 노출 없음)
   - API가 GET을 아직 지원 안 하면 조용히 숨김 → 백엔드 배포 후 자동 활성화
   ============================================================ */
(function () {
  'use strict';

  var API = (window.CARE_API
    ? window.CARE_API.replace('/api/esim', '/api/review')
    : 'https://jdisim-proxy.vercel.app/api/review');

  var CFG = {
    minStars: 1,        // 이 별점 미만은 숨김 (예: 4로 올리면 4~5점만 노출)
    maxItems: 30,       // 최대 로드 개수
    stripSpeed: 40      // 스트립 자동 스크롤 속도(px/s)
  };

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function maskName(n) {
    n = String(n || '').trim();
    if (!n) return '여행자';
    if (n.length === 1) return n + '*';
    if (n.length === 2) return n[0] + '*';
    return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
  }
  function relTime(ts) {
    if (!ts) return '';
    var d = new Date(ts); if (isNaN(d)) return '';
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 3600) return '방금 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    if (s < 86400 * 30) return Math.floor(s / 86400) + '일 전';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }
  function stars(n) {
    n = Math.max(0, Math.min(5, n | 0));
    return '<span class="jrv-stars" aria-label="' + n + '점">' + '★'.repeat(n) + '<span class="jrv-stars-off">' + '★'.repeat(5 - n) + '</span></span>';
  }

  /* ---------- 스타일 (사이트 토큰 상속) ---------- */
  function injectCSS() {
    if (document.getElementById('jrvCSS')) return;
    var st = document.createElement('style');
    st.id = 'jrvCSS';
    st.textContent =
      '.jrv{--jrv-accent:var(--accent,#F2751F);--jrv-teal:var(--fox-teal,#2BB3A3);--jrv-ink:var(--ink-warm,#221510);font-family:inherit}' +
      '.jrv *{box-sizing:border-box}' +
      '.jrv-stars{color:#F59E0B;letter-spacing:1px;font-size:.9em}.jrv-stars-off{color:#E4E8EF}' +
      '.jrv-badge{display:inline-flex;align-items:center;gap:5px;background:var(--fox-teal-light,rgba(43,179,163,.1));color:var(--jrv-teal);font-size:.72rem;font-weight:800;padding:4px 10px;border-radius:999px}' +
      '.jrv-badge::before{content:"✓";font-weight:900}' +
      /* strip */
      '.jrv-strip{overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}' +
      '.jrv-strip-track{display:flex;gap:14px;width:max-content;will-change:transform}' +
      '.jrv-card{flex:0 0 auto;width:250px;background:#fff;border:1px solid #F0E8E0;border-radius:16px;padding:14px 16px;box-shadow:0 4px 14px rgba(34,21,16,.05)}' +
      '.jrv-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}' +
      '.jrv-who{font-size:.78rem;font-weight:800;color:var(--jrv-ink)}' +
      '.jrv-meta{font-size:.7rem;color:#94a3b8;font-weight:600}' +
      '.jrv-txt{font-size:.83rem;line-height:1.55;color:#3d4654;font-weight:600;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all}' +
      '.jrv-country{display:inline-block;font-size:.7rem;font-weight:800;color:var(--jrv-accent);background:var(--accent-light,rgba(242,117,31,.09));padding:2px 8px;border-radius:999px;margin-top:8px}' +
      /* panel */
      '.jrv-panel{background:#fff;border:1px solid #F0E8E0;border-radius:20px;padding:20px;box-shadow:0 6px 20px rgba(34,21,16,.05)}' +
      '.jrv-sum{display:flex;align-items:center;gap:18px;padding-bottom:16px;border-bottom:1px solid #F4EFE9;margin-bottom:14px;flex-wrap:wrap}' +
      '.jrv-avg{font-size:2.2rem;font-weight:900;color:var(--jrv-ink);line-height:1}' +
      '.jrv-avg small{display:block;font-size:.72rem;color:#94a3b8;font-weight:700;margin-top:4px}' +
      '.jrv-bars{flex:1;min-width:150px}' +
      '.jrv-bar{display:flex;align-items:center;gap:8px;font-size:.7rem;color:#94a3b8;font-weight:700;margin:3px 0}' +
      '.jrv-bar-track{flex:1;height:6px;background:#F4EFE9;border-radius:99px;overflow:hidden}' +
      '.jrv-bar-fill{height:100%;background:linear-gradient(90deg,#F97316,#F59E0B);border-radius:99px}' +
      '.jrv-item{padding:12px 0;border-bottom:1px solid #F8F4EF}' +
      '.jrv-item:last-child{border-bottom:none}' +
      '.jrv-more{display:block;width:100%;margin-top:10px;padding:11px;border:1.5px solid #F0E8E0;border-radius:12px;background:#FFFDFB;font-family:inherit;font-size:.82rem;font-weight:800;color:var(--jrv-ink);cursor:pointer}' +
      '.jrv-more:hover{border-color:var(--jrv-accent);color:var(--jrv-accent)}' +
      '@media(prefers-reduced-motion:reduce){.jrv-strip-track{animation:none!important;transform:none!important}}';
    document.head.appendChild(st);
  }

  /* ---------- 데이터 ---------- */
  function normalize(raw) {
    var arr = Array.isArray(raw) ? raw : (raw && (raw.reviews || raw.list || raw.data)) || [];
    return arr.map(function (r) {
      return {
        stars: parseInt(r.stars || r.rating, 10) || 0,
        text: r.text || r.review || '',
        country: r.country || '',
        name: r.name || r.buyerName || '',
        days: r.days || '',
        ts: r.at || r.ts || r.createdAt || r.date || r.time || null
      };
    }).filter(function (r) {
      return r.stars >= CFG.minStars && !r.hidden;
    }).sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); })
      .slice(0, CFG.maxItems);
  }

  function fetchReviews() {
    return fetch(API, { method: 'GET' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(normalize)
      .catch(function () { return []; });
  }

  /* ---------- 렌더: 카드 1장 ---------- */
  function cardHTML(r) {
    return '<div class="jrv-card">' +
      '<div class="jrv-card-hd"><span class="jrv-who">' + esc(maskName(r.name)) + '</span><span class="jrv-meta">' + esc(relTime(r.ts)) + '</span></div>' +
      stars(r.stars) +
      (r.text ? '<div class="jrv-txt" style="margin-top:6px;">' + esc(r.text) + '</div>' : '') +
      (r.country ? '<span class="jrv-country">' + esc(r.country) + (r.days ? ' · ' + esc(r.days) + '일' : '') + '</span>' : '') +
      '</div>';
  }

  /* ---------- 렌더: strip ---------- */
  function renderStrip(el, list) {
    var cards = list.map(cardHTML).join('');
    el.classList.add('jrv');
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">' +
        '<span class="jrv-badge">JDISIM 발급 고객 인증 후기</span>' +
        '<span style="font-size:.72rem;color:#94a3b8;font-weight:700;">eSIM을 실제 발급받은 고객만 남길 수 있어요</span>' +
      '</div>' +
      '<div class="jrv-strip"><div class="jrv-strip-track">' + cards + cards + '</div></div>';
    // 무한 스크롤 애니메이션 (JS 구동 — 카드 수에 맞춰 속도 일정)
    var track = el.querySelector('.jrv-strip-track');
    var half = 0, x = 0, last = null, paused = false;
    function measure() { half = track.scrollWidth / 2; }
    measure(); window.addEventListener('resize', measure);
    track.addEventListener('mouseenter', function(){ paused = true; });
    track.addEventListener('mouseleave', function(){ paused = false; });
    track.addEventListener('touchstart', function(){ paused = true; }, {passive:true});
    track.addEventListener('touchend', function(){ paused = false; });
    function step(t) {
      if (last == null) last = t;
      var dt = (t - last) / 1000; last = t;
      if (!paused && half > 0) {
        x -= CFG.stripSpeed * dt;
        if (-x >= half) x += half;
        track.style.transform = 'translateX(' + x + 'px)';
      }
      requestAnimationFrame(step);
    }
    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(step);
    }
  }

  /* ---------- 렌더: panel ---------- */
  function renderPanel(el, list) {
    var total = list.length;
    var avg = total ? (list.reduce(function (s, r) { return s + r.stars; }, 0) / total) : 0;
    var dist = [0, 0, 0, 0, 0];
    list.forEach(function (r) { if (r.stars >= 1 && r.stars <= 5) dist[r.stars - 1]++; });
    var barsHTML = [5, 4, 3, 2, 1].map(function (s) {
      var pct = total ? Math.round(dist[s - 1] / total * 100) : 0;
      return '<div class="jrv-bar"><span style="width:22px;">' + s + '점</span><div class="jrv-bar-track"><div class="jrv-bar-fill" style="width:' + pct + '%"></div></div><span style="width:32px;text-align:right;">' + pct + '%</span></div>';
    }).join('');

    var SHOW = 5;
    function itemsHTML(n) {
      return list.slice(0, n).map(function (r) {
        return '<div class="jrv-item">' +
          '<div class="jrv-card-hd"><span class="jrv-who">' + esc(maskName(r.name)) +
          (r.country ? ' <span style="color:#94a3b8;font-weight:600;">· ' + esc(r.country) + (r.days ? ' ' + esc(r.days) + '일' : '') + '</span>' : '') +
          '</span><span class="jrv-meta">' + esc(relTime(r.ts)) + '</span></div>' +
          stars(r.stars) +
          (r.text ? '<div class="jrv-txt" style="margin-top:5px;-webkit-line-clamp:6;">' + esc(r.text) + '</div>' : '') +
          '</div>';
      }).join('');
    }

    el.classList.add('jrv');
    el.innerHTML =
      '<div class="jrv-panel">' +
        '<div class="jrv-sum">' +
          '<div class="jrv-avg">' + avg.toFixed(1) + '<small>후기 ' + total + '건</small></div>' +
          '<div class="jrv-bars">' + barsHTML + '</div>' +
          '<span class="jrv-badge">발급 고객 인증</span>' +
        '</div>' +
        '<div class="jrv-list">' + itemsHTML(SHOW) + '</div>' +
        (total > SHOW ? '<button type="button" class="jrv-more">후기 더 보기 (' + (total - SHOW) + ')</button>' : '') +
      '</div>';

    var btn = el.querySelector('.jrv-more');
    if (btn) btn.onclick = function () {
      el.querySelector('.jrv-list').innerHTML = itemsHTML(total);
      btn.remove();
    };
  }

  /* ---------- 마운트 ---------- */
  function mountAll(list) {
    document.querySelectorAll('[data-jdisim-reviews]').forEach(function (el) {
      var mode = el.getAttribute('data-jdisim-reviews') || 'strip';
      var country = el.getAttribute('data-country');
      var filtered = country ? list.filter(function (r) { return (r.country || '').indexOf(country) !== -1; }) : list;
      if (!filtered.length) { el.style.display = 'none'; return; }  // 빈 위젯 노출 방지
      el.style.display = '';
      if (mode === 'panel') renderPanel(el, filtered);
      else renderStrip(el, filtered);
    });
  }

  function init() {
    if (!document.querySelector('[data-jdisim-reviews]')) return;
    injectCSS();
    fetchReviews().then(mountAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 외부에서 수동 마운트/재로드 가능
  window.JDISIM_REVIEWS = { reload: init, config: CFG };
})();
