/* ============================================================
   JDISIM 공용 앱 스크립트 v2 (jdisim-app.js)
   원칙: 페이지에 이미 있는 기능은 절대 중복 생성하지 않는다.
   - 글자 크기: 헤더에 통합 (플로팅 버튼 X). issue.html처럼 자체
     #fzBtn이 있으면 아무것도 안 함. 저장 키는 전 페이지 공통 'jd_fz'.
   - 오프라인 배너: 자체 #offBar 있으면 스킵.
   - PWA 설치 배너 + 앱 모드 햅틱.
   ============================================================ */
(function () {
  'use strict';
  var FZ_KEY = 'jd_fz';                          // 0=보통 1=크게 2=아주 크게 (issue.html과 공유)
  var FZ_PX = ['18px', '20px', '22px'];
  var FZ_LV = ['보통', '크게', '아주 크게'];

  function getFz() { var v = parseInt(localStorage.getItem(FZ_KEY) || '0', 10); return (v >= 0 && v <= 2) ? v : 0; }
  function applyFz(v) { document.documentElement.style.fontSize = FZ_PX[v]; }
  applyFz(getFz());

  function ready(fn) { document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    mountFontControl();
    mountOffline();
    setupInstall();
    setupAppMode();
  });

  /* ---------- 토스트 (경량) ---------- */
  var tt = null;
  function toast(msg) {
    var t = document.getElementById('jd-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'jd-toast';
      t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(120px + env(safe-area-inset-bottom,0px));z-index:99950;background:#221510;color:#fff;font-size:15px;font-weight:600;padding:10px 18px;border-radius:22px;opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '0.94';
    clearTimeout(tt); tt = setTimeout(function () { t.style.opacity = '0'; }, 1500);
  }

  /* ---------- 1. 글자 크기: 헤더 통합 ---------- */
  function mountFontControl() {
    if (document.getElementById('fzBtn') || document.getElementById('jd-fz')) return; // 자체 구현/중복 방지
    // 장바구니 버튼 앞(모바일 .app-header) 또는 .header-actions(PC)에 삽입
    var slot = document.querySelector('.app-header .cart-btn') || document.querySelector('.header-actions .cart-btn');
    if (!slot) return;                            // 헤더 없는 페이지엔 안 붙임 (난잡 방지)
    var b = document.createElement('button');
    b.id = 'jd-fz'; b.type = 'button';
    b.setAttribute('aria-label', '글자 크기 조절');
    b.style.cssText = 'width:38px;height:38px;margin-right:8px;border-radius:12px;border:1px solid rgba(34,21,16,.12);background:rgba(255,255,255,.85);color:#221510;font-weight:800;font-size:15px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;';
    b.innerHTML = '가<span style="font-size:10px;align-self:flex-start;color:#F2751F;">+</span>';
    b.addEventListener('click', function () {
      var v = (getFz() + 1) % 3;
      localStorage.setItem(FZ_KEY, String(v));
      applyFz(v); haptic(8);
      toast('글자 크기: ' + FZ_LV[v]);
    });
    slot.parentNode.insertBefore(b, slot);
  }

  /* ---------- 2. 오프라인 배너 ---------- */
  function mountOffline() {
    if (document.getElementById('offBar')) return; // issue.html 자체 구현 존중
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99960;display:none;background:#b45309;color:#fff;text-align:center;font-size:14px;font-weight:600;padding:8px 12px;';
    d.textContent = '오프라인 상태예요 · 저장된 화면은 계속 볼 수 있어요';
    document.body.appendChild(d);
    function upd() { d.style.display = navigator.onLine ? 'none' : 'block'; }
    window.addEventListener('online', function () { upd(); toast('다시 온라인이 되었어요'); });
    window.addEventListener('offline', upd);
    upd();
  }

  /* ---------- 3. PWA 설치 배너 (7일 스누즈) ---------- */
  var dp = null;
  function standalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function setupInstall() {
    if (standalone()) return;
    if (Date.now() - (parseInt(localStorage.getItem('jd_inst_snz') || '0', 10)) < 6048e5) return;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); dp = e;
      if (document.getElementById('jd-inst')) return;
      var d = document.createElement('div');
      d.id = 'jd-inst';
      d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:99940;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid rgba(34,21,16,.1);border-radius:16px;box-shadow:0 8px 28px rgba(34,21,16,.16);padding:12px 14px;';
      d.innerHTML = '<img src="images/icon-192.png" alt="" style="width:44px;height:44px;border-radius:12px;flex:none;">' +
        '<div style="flex:1;min-width:0;"><b style="font-size:15px;display:block;color:#221510;">JDISIM 앱으로 설치</b><span style="font-size:13px;color:#8a7c72;">홈 화면에서 바로, 오프라인 QR 지원</span></div>' +
        '<button type="button" data-a="no" style="flex:none;border:0;background:transparent;color:#a89c93;padding:10px 6px;font-weight:700;font-size:14px;cursor:pointer;">나중에</button>' +
        '<button type="button" data-a="go" style="flex:none;border:0;border-radius:12px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;">설치</button>';
      document.body.appendChild(d);
      d.addEventListener('click', function (ev) {
        var a = ev.target.getAttribute('data-a');
        if (a === 'go') { d.remove(); if (dp) { dp.prompt(); dp = null; } }
        if (a === 'no') { d.remove(); localStorage.setItem('jd_inst_snz', String(Date.now())); }
      });
    });
  }

  /* ---------- 4. 앱 모드 햅틱 ---------- */
  function haptic(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function setupAppMode() {
    if (!standalone()) return;
    document.documentElement.classList.add('jd-app');
    document.addEventListener('click', function (e) {
      if (e.target.closest('button, .nav-item, .store-card, .category-tab')) haptic(6);
    }, { passive: true });
  }

  window.JDApp = { toast: toast, setFz: function (v) { localStorage.setItem(FZ_KEY, String(v)); applyFz(getFz()); } };
})();
