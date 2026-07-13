/* ============================================================
   JDISIM 공용 앱 스크립트 (jdisim-app.js)
   1) 글자 크기 조절 (보통 18 / 크게 20 / 아주 크게 22) — localStorage 저장
   2) PWA 설치 배너 (beforeinstallprompt)
   3) 오프라인 상태 배너
   4) 앱 모드(standalone) 감지 + 햅틱
   모든 페이지 <head>에 1줄로 포함: <script src="jdisim-app.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  // ---------- 0. 공통 상수 ----------
  var FS_KEY = 'jdisim_fs';                    // 1=보통, 2=크게, 3=아주 크게
  var FS_MAP = { 1: '18px', 2: '20px', 3: '22px' };
  var FS_LABEL = { 1: '보통', 2: '크게', 3: '아주 크게' };

  // ---------- 1. 글자 크기: 즉시 적용 (FOUC 최소화) ----------
  function getFs() {
    var v = parseInt(localStorage.getItem(FS_KEY) || '1', 10);
    return (v >= 1 && v <= 3) ? v : 1;
  }
  function applyFs(level) {
    document.documentElement.style.fontSize = FS_MAP[level];
    document.documentElement.setAttribute('data-fs', level);
  }
  applyFs(getFs());

  // ---------- 준비되면 UI 구성 ----------
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    injectStyles();
    buildFontButton();
    buildOfflineBanner();
    setupInstallPrompt();
    setupAppMode();
  });

  // ---------- 스타일 ----------
  function injectStyles() {
    var css = [
      /* 가독성 하한: 지나치게 작은 줄간격 보정 */
      'html[data-fs="2"] body, html[data-fs="3"] body { letter-spacing: -0.01em; }',

      /* 글자 크기 버튼 */
      '#jd-fs-btn{position:fixed;left:14px;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:9990;',
      'width:48px;height:48px;border-radius:50%;border:1px solid rgba(15,23,42,.12);',
      'background:#fff;box-shadow:0 4px 14px rgba(15,23,42,.16);cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;font-weight:800;color:#0f172a;',
      'font-size:17px;line-height:1;user-select:none;-webkit-user-select:none;}',
      '#jd-fs-btn:active{transform:scale(.94);}',
      '#jd-fs-btn .jd-fs-a{font-size:12px;align-self:flex-end;margin-bottom:11px;color:#26a69a;}',

      /* 토스트 */
      '#jd-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(150px + env(safe-area-inset-bottom,0px));',
      'z-index:9995;background:#0f172a;color:#fff;font-size:15px;font-weight:600;',
      'padding:10px 18px;border-radius:22px;opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;}',
      '#jd-toast.show{opacity:.94;}',

      /* 오프라인 배너 */
      '#jd-offline{position:fixed;top:0;left:0;right:0;z-index:9996;display:none;',
      'background:#b45309;color:#fff;text-align:center;font-size:14px;font-weight:600;',
      'padding:8px 12px calc(8px);}',
      '#jd-offline.show{display:block;}',

      /* 설치 배너 */
      '#jd-install{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9992;',
      'display:none;align-items:center;gap:12px;background:#fff;border:1px solid rgba(15,23,42,.1);',
      'border-radius:16px;box-shadow:0 8px 28px rgba(15,23,42,.18);padding:12px 14px;}',
      '#jd-install.show{display:flex;}',
      '#jd-install img{width:44px;height:44px;border-radius:12px;flex:none;}',
      '#jd-install .t{flex:1;min-width:0;} #jd-install .t b{font-size:15px;display:block;color:#0f172a;}',
      '#jd-install .t span{font-size:13px;color:#64748b;}',
      '#jd-install button{flex:none;border:0;border-radius:12px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;}',
      '#jd-install .go{background:#26a69a;color:#fff;} #jd-install .no{background:transparent;color:#94a3b8;padding:10px 6px;}',

      /* 앱(standalone) 모드 미세 조정 */
      'html.jd-app body{overscroll-behavior-y:none;}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'jd-app-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- 토스트 ----------
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('jd-toast');
    if (!t) { t = document.createElement('div'); t.id = 'jd-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }

  // ---------- 1-2. 글자 크기 버튼 ----------
  function buildFontButton() {
    if (document.getElementById('jd-fs-btn')) return;
    var b = document.createElement('button');
    b.id = 'jd-fs-btn';
    b.type = 'button';
    b.setAttribute('aria-label', '글자 크기 조절');
    b.innerHTML = '<span class="jd-fs-a">가</span>가';
    b.addEventListener('click', function () {
      var next = getFs() % 3 + 1;           // 1→2→3→1
      localStorage.setItem(FS_KEY, String(next));
      applyFs(next);
      haptic(10);
      toast('글자 크기: ' + FS_LABEL[next]);
    });
    document.body.appendChild(b);
  }

  // ---------- 2. PWA 설치 배너 ----------
  var deferredPrompt = null;
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function setupInstallPrompt() {
    if (isStandalone()) return;
    var snoozedAt = parseInt(localStorage.getItem('jdisim_install_snooze') || '0', 10);
    if (Date.now() - snoozedAt < 7 * 24 * 3600 * 1000) return; // 7일 스누즈

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
    });
  }
  function showInstallBanner() {
    if (document.getElementById('jd-install')) return;
    var d = document.createElement('div');
    d.id = 'jd-install';
    d.innerHTML =
      '<img src="images/icon-192.png" alt="">' +
      '<div class="t"><b>JDISIM 앱으로 설치</b><span>홈 화면에서 바로 열고, 오프라인에서도 QR 확인</span></div>' +
      '<button type="button" class="no">나중에</button>' +
      '<button type="button" class="go">설치</button>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('show'); });

    d.querySelector('.go').addEventListener('click', function () {
      d.classList.remove('show');
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
    });
    d.querySelector('.no').addEventListener('click', function () {
      d.classList.remove('show');
      localStorage.setItem('jdisim_install_snooze', String(Date.now()));
    });
  }

  // ---------- 3. 오프라인 배너 ----------
  function buildOfflineBanner() {
    var d = document.createElement('div');
    d.id = 'jd-offline';
    d.textContent = '오프라인 상태예요 · 저장된 QR과 요금제는 계속 볼 수 있어요';
    document.body.appendChild(d);
    function sync() { d.classList.toggle('show', !navigator.onLine); }
    window.addEventListener('online', function () { sync(); toast('다시 온라인이 되었어요'); });
    window.addEventListener('offline', sync);
    sync();
  }

  // ---------- 4. 앱 모드 + 햅틱 ----------
  function haptic(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }
  function setupAppMode() {
    if (isStandalone()) {
      document.documentElement.classList.add('jd-app');
      // 주요 버튼 탭 시 미세 햅틱 (앱 감성)
      document.addEventListener('click', function (e) {
        var el = e.target.closest('button, .nav-item, .store-card, .category-tab');
        if (el) haptic(6);
      }, { passive: true });
    }
  }

  // 외부에서 쓸 수 있게 노출
  window.JDApp = { setFontScale: function (l) { localStorage.setItem(FS_KEY, String(l)); applyFs(getFs()); }, toast: toast };
})();
