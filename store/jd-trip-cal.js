/* JDISIM 여행 범위 캘린더 (2026-07-19) — 출발일→귀국일 탭 두 번으로 범위 선택.
 * 사용: window.JDTripCal.mount(containerEl, { dep, ret, onRange(depISO, retISO) })
 * 의존 없음(바닐라). 색·크기는 디자인 토큰 정본(jd-tokens.css 값)과 동일 리터럴.
 */
(function () {
  'use strict';
  var CSS_ID = 'jdTripCalCss';
  var CSS = [
    '.jdcal{background:#fff;border:1px solid #EFF2F6;border-radius:16px;padding:14px 12px;max-width:420px;margin:0 auto;}',
    '.jdcal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 4px;}',
    '.jdcal-title{font-size:1.0625rem;font-weight:900;color:#101623;letter-spacing:-0.01em;}',
    '.jdcal-nav{width:44px;height:44px;border:1.5px solid #E2E8F0;border-radius:12px;background:#fff;color:#334155;font-size:1.0625rem;font-weight:900;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
    '.jdcal-nav:disabled{opacity:0.3;cursor:default;}',
    '.jdcal-week{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:2px;}',
    '.jdcal-week span{text-align:center;font-size:0.75rem;font-weight:800;color:#8B94A7;padding:6px 0;}',
    '.jdcal-week span:first-child{color:#DC2626;}',
    '.jdcal-grid{display:grid;grid-template-columns:repeat(7,1fr);row-gap:2px;}',
    '.jdcal-d{position:relative;height:46px;border:none;background:none;font:inherit;font-size:0.9375rem;font-weight:700;color:#101623;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:12px;}',
    '.jdcal-d:disabled{color:#CBD5E1;cursor:default;}',
    '.jdcal-d.jd-today::after{content:"";position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#F1690D;}',
    '.jdcal-d.jd-in{background:#FFF4EC;border-radius:0;}',
    '.jdcal-d.jd-dep,.jdcal-d.jd-ret{background:#F1690D;color:#fff;font-weight:900;border-radius:12px;z-index:1;}',
    '.jdcal-d.jd-dep.jd-haspair{border-radius:12px 0 0 12px;}',
    '.jdcal-d.jd-ret{border-radius:0 12px 12px 0;}',
    '.jdcal-d.jd-dep.jd-ret{border-radius:12px;}',
    '.jdcal-hint{margin-top:8px;text-align:center;font-size:0.84375rem;font-weight:700;color:#64748B;}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function mount(el, opts) {
    if (!el) return null;
    injectCss();
    opts = opts || {};
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var state = {
      dep: opts.dep || null,   // 'YYYY-MM-DD'
      ret: opts.ret || null,
      view: new Date((opts.dep ? new Date(opts.dep + 'T00:00:00') : today).getFullYear(), (opts.dep ? new Date(opts.dep + 'T00:00:00') : today).getMonth(), 1)
    };
    function render() {
      var y = state.view.getFullYear(), m = state.view.getMonth();
      var first = new Date(y, m, 1), startDow = first.getDay();
      var dim = new Date(y, m + 1, 0).getDate();
      var isCurMonth = y === today.getFullYear() && m === today.getMonth();
      var cells = '';
      for (var i = 0; i < startDow; i++) cells += '<span></span>';
      for (var d = 1; d <= dim; d++) {
        var dt = new Date(y, m, d);
        var di = iso(dt);
        var dis = dt < today;
        var cls = 'jdcal-d';
        if (di === iso(today)) cls += ' jd-today';
        if (state.dep && di === state.dep) cls += ' jd-dep' + (state.ret ? ' jd-haspair' : '');
        if (state.ret && di === state.ret) cls += ' jd-ret';
        if (state.dep && state.ret && di > state.dep && di < state.ret) cls += ' jd-in';
        cells += '<button type="button" class="' + cls + '" data-d="' + di + '"' + (dis ? ' disabled' : '') + '>' + d + '</button>';
      }
      var hint = !state.dep ? '✈️ 출발일을 눌러 주세요'
        : !state.ret ? '🛬 귀국일을 눌러 주세요 (출발일 다시 누르면 취소)'
        : '';
      el.innerHTML = '<div class="jdcal">' +
        '<div class="jdcal-head">' +
        '<button type="button" class="jdcal-nav" data-nav="-1"' + (isCurMonth ? ' disabled' : '') + '>‹</button>' +
        '<span class="jdcal-title">' + y + '년 ' + (m + 1) + '월</span>' +
        '<button type="button" class="jdcal-nav" data-nav="1">›</button></div>' +
        '<div class="jdcal-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>' +
        '<div class="jdcal-grid">' + cells + '</div>' +
        (hint ? '<div class="jdcal-hint">' + hint + '</div>' : '') +
        '</div>';
      el.querySelectorAll('[data-nav]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.view = new Date(y, m + parseInt(b.dataset.nav, 10), 1);
          render();
        });
      });
      el.querySelectorAll('.jdcal-d:not(:disabled)').forEach(function (b) {
        b.addEventListener('click', function () {
          var di = b.dataset.d;
          if (!state.dep || (state.dep && state.ret)) { state.dep = di; state.ret = null; }
          else if (di === state.dep) { state.dep = null; state.ret = null; }
          else if (di < state.dep) { state.dep = di; state.ret = null; }
          else { state.ret = di; }
          render();
          if (state.dep && state.ret && typeof opts.onRange === 'function') opts.onRange(state.dep, state.ret);
        });
      });
    }
    render();
    return { get: function () { return { dep: state.dep, ret: state.ret }; } };
  }

  window.JDTripCal = { mount: mount };
})();
