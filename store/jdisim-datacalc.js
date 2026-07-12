/* ============================================================
   JDISIM 데이터 계산기 v1.0 — "나 몇 GB 필요해?"를 10초 만에
   사용법: <div data-jdisim-datacalc></div>          ← 펼친 상태
          <div data-jdisim-datacalc="fold"></div>    ← 접힌 한 줄 (탭하면 펼침)
   ============================================================ */
(function () {
  'use strict';

  // 하루 사용량 추정치(MB) — 보수적 평균
  var APPS = [
    { id: 'map',   icon: '🗺️', name: '지도·길찾기',   mb: 150 },
    { id: 'chat',  icon: '💬', name: '카톡·메신저',   mb: 50  },
    { id: 'sns',   icon: '📸', name: '인스타·SNS',    mb: 250 },
    { id: 'yt',    icon: '▶️', name: '유튜브·영상',   mb: 900 },
    { id: 'music', icon: '🎧', name: '음악 스트리밍', mb: 100 },
    { id: 'call',  icon: '📞', name: '보이스톡·영상통화', mb: 200 },
    { id: 'hot',   icon: '💻', name: '노트북 핫스팟', mb: 600 }
  ];
  var MARGIN = 1.3;              // 여유 계수 30%
  var UNLIMITED_OVER_GB = 2.0;   // 일 환산 2GB 넘으면 무제한 추천

  function css() {
    if (document.getElementById('jdcCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdcCSS';
    st.textContent =
      '.jdc{--a:var(--accent,#F2751F);--t:var(--fox-teal,#2BB3A3);--ink:var(--ink-warm,#221510);font-family:inherit}' +
      '.jdc *{box-sizing:border-box}' +
      '.jdc-card{background:#fff;border:1.5px solid #F0E8E0;border-radius:18px;overflow:hidden;box-shadow:0 4px 14px rgba(34,21,16,.04)}' +
      '.jdc-toggle{display:flex;align-items:center;gap:10px;width:100%;padding:15px 16px;border:none;background:none;font-family:inherit;cursor:pointer;text-align:left}' +
      '.jdc-toggle b{font-size:.9rem;font-weight:900;color:var(--ink)}' +
      '.jdc-toggle span{font-size:.7rem;color:#94a3b8;font-weight:700}' +
      '.jdc-arrow{margin-left:auto;color:var(--a);font-weight:900;transition:transform .2s}' +
      '.jdc.open .jdc-arrow{transform:rotate(180deg)}' +
      '.jdc-body{display:none;padding:2px 16px 18px}' +
      '.jdc.open .jdc-body{display:block}' +
      '.jdc-label{font-size:.72rem;font-weight:800;color:#8B94A7;margin:12px 0 8px}' +
      '.jdc-chips{display:flex;flex-wrap:wrap;gap:7px}' +
      '.jdc-chip{border:1.5px solid #EDE6DE;background:#FFFDFB;border-radius:999px;padding:8px 13px;font-family:inherit;font-size:.76rem;font-weight:800;color:#5a6675;cursor:pointer;transition:.15s}' +
      '.jdc-chip.on{border-color:var(--a);background:rgba(242,117,31,.08);color:var(--a)}' +
      '.jdc-days{display:flex;align-items:center;gap:14px}' +
      '.jdc-step{width:38px;height:38px;border-radius:12px;border:1.5px solid #EDE6DE;background:#fff;font-size:1.1rem;font-weight:900;color:var(--ink);cursor:pointer}' +
      '.jdc-days b{font-size:1.05rem;font-weight:900;color:var(--ink);min-width:52px;text-align:center}' +
      '.jdc-out{margin-top:16px;background:linear-gradient(135deg,rgba(242,117,31,.07),rgba(245,158,11,.07));border:1px solid rgba(242,117,31,.18);border-radius:14px;padding:14px;text-align:center}' +
      '.jdc-out b{display:block;font-size:1.35rem;font-weight:900;color:var(--a)}' +
      '.jdc-out span{font-size:.72rem;color:#8B94A7;font-weight:700}' +
      '.jdc-cta{display:block;width:100%;margin-top:10px;padding:13px;border:none;border-radius:13px;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-family:inherit;font-size:.88rem;font-weight:900;cursor:pointer;text-decoration:none;text-align:center;box-shadow:0 8px 22px rgba(242,117,31,.22)}';
    document.head.appendChild(st);
  }

  function render(el) {
    css();
    var startOpen = el.getAttribute('data-jdisim-datacalc') !== 'fold';
    var state = { on: { map: true, chat: true, sns: true }, days: 5 };

    el.classList.add('jdc');
    el.innerHTML =
      '<div class="jdc-card">' +
        '<button type="button" class="jdc-toggle"><span style="font-size:1.15rem">📊</span><div><b>데이터 얼마나 필요할까?</b><br><span>쓰는 앱만 고르면 10초 계산</span></div><span class="jdc-arrow">▾</span></button>' +
        '<div class="jdc-body">' +
          '<div class="jdc-label">여행 중 쓸 것들 (복수 선택)</div>' +
          '<div class="jdc-chips">' + APPS.map(function (a) {
            return '<button type="button" class="jdc-chip' + (state.on[a.id] ? ' on' : '') + '" data-id="' + a.id + '">' + a.icon + ' ' + a.name + '</button>';
          }).join('') + '</div>' +
          '<div class="jdc-label">여행 일수</div>' +
          '<div class="jdc-days"><button type="button" class="jdc-step" data-d="-1">−</button><b id="jdcD"></b><button type="button" class="jdc-step" data-d="1">＋</button></div>' +
          '<div class="jdc-out"><b id="jdcGB"></b><span id="jdcMsg"></span></div>' +
          '<a class="jdc-cta" id="jdcCTA">🦊 딱 맞는 요금제 보러가기</a>' +
        '</div>' +
      '</div>';
    if (startOpen) el.classList.add('open');

    function calc() {
      var perDay = APPS.reduce(function (s, a) { return s + (state.on[a.id] ? a.mb : 0); }, 0);
      var totalGB = perDay * state.days * MARGIN / 1000;
      var dayGB = perDay * MARGIN / 1000;
      el.querySelector('#jdcD').textContent = state.days + '일';
      var gbEl = el.querySelector('#jdcGB'), msgEl = el.querySelector('#jdcMsg');
      if (!perDay) { gbEl.textContent = '앱을 골라주세요'; msgEl.textContent = ''; return; }
      if (dayGB >= UNLIMITED_OVER_GB) {
        gbEl.textContent = '데이터 무제한 추천';
        msgEl.textContent = '일 ' + dayGB.toFixed(1) + 'GB 사용 예상 — 용량제보다 무제한이 이득이에요';
      } else {
        var rec = Math.max(1, Math.ceil(totalGB));
        gbEl.textContent = '총 ' + rec + 'GB 요금제 추천';
        msgEl.textContent = state.days + '일 · 일 약 ' + dayGB.toFixed(1) + 'GB (여유 30% 포함)';
      }
    }

    el.querySelector('.jdc-toggle').onclick = function () { el.classList.toggle('open'); };
    el.querySelectorAll('.jdc-chip').forEach(function (c) {
      c.onclick = function () {
        var id = c.getAttribute('data-id');
        state.on[id] = !state.on[id];
        c.classList.toggle('on', state.on[id]);
        calc();
      };
    });
    el.querySelectorAll('.jdc-step').forEach(function (b) {
      b.onclick = function () {
        state.days = Math.min(30, Math.max(1, state.days + parseInt(b.getAttribute('data-d'), 10)));
        calc();
      };
    });
    var cta = el.querySelector('#jdcCTA');
    cta.onclick = function (e) {
      if (window.switchNav) { e.preventDefault(); switchNav('store'); }   // 모바일 앱 내 이동
    };
    cta.href = 'https://smartstore.naver.com/butt_on';                    // PC/가이드 폴백
    calc();
  }

  function init() {
    document.querySelectorAll('[data-jdisim-datacalc]').forEach(render);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
