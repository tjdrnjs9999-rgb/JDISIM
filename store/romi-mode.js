/* ============================================================
   ROMI Mode — 케어링크(issue.html) 전용 여행모드/한국모드 위젯
   · 구매자 전용: 케어링크 URL 파라미터(주문 정보)가 있을 때만 렌더
   · 여행 모드 켜기: Wi-Fi 통화 ON + 데이터=여행 eSIM + 한국회선 로밍 OFF
   · 한국 모드 복귀: 데이터=한국 회선 + 여행 eSIM 끄기 (삭제 경고 포함)
   · 상태는 localStorage(jd_travel_mode)로 왕복 토글
   사용: <div id="romiModeSlot"></div> 아래에서 RomiMode.init({...})
   ============================================================ */
window.RomiMode = (function () {
  'use strict';

  var cfg = {
    slotId: 'romiModeSlot',
    // aligo_bridge 실측 파라미터 (v6.3, L506~510): care=ICCID(항상) / plan / n / bd / o(조건부)
    gateParams: ['care', 'o', 'n', 'bd', 'plan'],
    storageKey: 'jd_travel_mode' // 'travel' | 'home'
  };

  function track(ev, p) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: ev }, p || {}));
      if (typeof gtag === 'function') gtag('event', ev, p || {});
    } catch (e) {}
  }

  function isBuyer() {
    try {
      var q = new URLSearchParams(location.search);
      for (var i = 0; i < cfg.gateParams.length; i++) {
        var v = q.get(cfg.gateParams[i]);
        if (v && v.trim()) return true;
      }
    } catch (e) {}
    return false;
  }

  function platform() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/SM-|Samsung/i.test(ua)) return 'samsung';
    if (/Android/i.test(ua)) return 'android';
    return 'etc';
  }

  function getMode() {
    try { return localStorage.getItem(cfg.storageKey) === 'travel' ? 'travel' : 'home'; }
    catch (e) { return 'home'; }
  }
  function setMode(m) {
    try { localStorage.setItem(cfg.storageKey, m); } catch (e) {}
  }

  // ── 단계 데이터: 플랫폼별 여행/복귀 ──
  function steps(mode, plat) {
    var wifiCallPath = {
      ios: '설정 → 전화 → <b>Wi-Fi 통화</b> 켜기',
      samsung: '전화 앱 → 우상단 ⋮ → 설정 → <b>Wi-Fi 통화(VoWiFi)</b> 켜기',
      android: '전화 앱 설정 또는 설정 검색창에 <b>"Wi-Fi 통화"</b> 입력 → 켜기',
      etc: '설정에서 <b>Wi-Fi 통화</b>를 찾아 켜기'
    }[plat];
    var dataPath = {
      ios: '설정 → 셀룰러 → <b>셀룰러 데이터</b>',
      samsung: '설정 → 연결 → SIM 관리자 → <b>모바일 데이터</b>',
      android: '설정 → 네트워크 및 인터넷 → SIM → <b>모바일 데이터</b>',
      etc: '설정의 SIM/데이터 메뉴'
    }[plat];

    if (mode === 'travel') return [
      { icon: '📶', title: 'Wi-Fi 통화 켜기 (한국 번호 통화가 와이파이로 — 로밍 수신료 걱정 끝)', body: wifiCallPath + '<br><small>한국 번호로 오는 전화·문자를 와이파이에서 국내 기준 요금으로 받아요. 통신사(SKT/KT/LGU+)별 명칭·요금 기준은 통신사 앱에서 한 번 확인!</small>' },
      { icon: '✈️', title: '데이터 회선을 여행 eSIM으로', body: dataPath + '에서 <b>여행 eSIM 선택</b> (데이터 전환 허용은 끄기)' },
      { icon: '🇰🇷', title: '한국 회선은 켜두고, 데이터 로밍만 끄기', body: '한국 회선 설정에서 <b>데이터 로밍 OFF</b> — 인증문자는 계속 받고 요금 폭탄은 차단' },
      { icon: '🛬', title: '현지 도착 후: 여행 eSIM 로밍 ON', body: '여행 eSIM 회선의 <b>데이터 로밍 ON</b> → 1~3분 내 연결. 안 되면 비행기모드 껐다 켜기' }
    ];
    return [
      { icon: '🇰🇷', title: '데이터 회선을 한국 회선으로 복귀', body: dataPath + '에서 <b>한국 회선(기존 번호) 선택</b>' },
      { icon: '🔌', title: '여행 eSIM 회선 끄기', body: '여행 eSIM 회선을 <b>끄기(비활성)</b>로만 두세요.<br><small>⚠️ <b>삭제는 신중히!</b> 일부 국가 상품은 삭제 시 재등록이 불가능해요. 남은 기간이 있다면 끄기만.</small>' },
      { icon: '📶', title: 'Wi-Fi 통화는 그대로 둬도 OK', body: '국내에서도 지하·시골 통화 품질에 도움돼요. 끄고 싶다면 켰던 곳에서 OFF' },
      { icon: '🧡', title: '여행은 어떠셨어요?', body: '다음 여행도 로미가 함께할게요 — 리뷰 한 줄이 큰 힘이 됩니다!' }
    ];
  }

  // 안드로이드 한정: Wi-Fi 통화 토글 화면까지 딥링크 사다리 (토글 자체는 OS 보안상 자동화 불가)
  // ① WIFI_CALLING_SETTINGS(토글 화면 직행) → ② WIRELESS_SETTINGS(연결 설정) → ③ SETTINGS(설정 홈)
  // 앞 단계가 성공해 화면을 떠났으면(document.hidden) 다음 폴백은 발화하지 않음
  function tryOpenSettings() {
    try { location.href = 'intent://#Intent;action=android.settings.WIFI_CALLING_SETTINGS;end'; } catch (e) {}
    setTimeout(function () {
      if (document.hidden) return;
      try { location.href = 'intent://#Intent;action=android.settings.WIRELESS_SETTINGS;end'; } catch (e) {}
      setTimeout(function () {
        if (document.hidden) return;
        try { location.href = 'intent://#Intent;action=android.settings.SETTINGS;end'; } catch (e) {}
      }, 900);
    }, 1200);
  }

  var css = '.rm-card{background:linear-gradient(135deg,rgba(249,115,22,.07),rgba(245,158,11,.05));border:1.5px solid rgba(249,115,22,.35);border-radius:16px;padding:16px;margin:14px 0;word-break:keep-all;font-family:inherit}'
    + '.rm-card h4{margin:0 0 6px;font-size:.95rem;font-weight:800;color:#0f172a}'
    + '.rm-card p{margin:0 0 12px;font-size:.8rem;font-weight:600;color:#475569;line-height:1.65}'
    + '.rm-btn{display:block;width:100%;border:none;border-radius:14px;padding:14px;font-family:inherit;font-size:.92rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;box-shadow:0 6px 18px rgba(249,115,22,.28)}'
    + '.rm-btn.home{background:#fff;color:#F2751F;border:1.5px solid rgba(249,115,22,.5);box-shadow:none}'
    + '.rm-ov{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center}'
    + '.rm-sheet{background:#fff;border-radius:20px 20px 0 0;max-width:560px;width:100%;max-height:86vh;overflow-y:auto;padding:20px 18px 26px;color-scheme:only light}'
    + '.rm-sheet h3{margin:0 0 4px;font-size:1.05rem;font-weight:800;color:#0f172a}'
    + '.rm-sheet .rm-sub{font-size:.76rem;font-weight:700;color:#94a3b8;margin-bottom:14px}'
    + '.rm-step{display:flex;gap:10px;background:#fff;border:1px solid rgba(15,23,42,.08);border-radius:14px;padding:12px;margin-bottom:9px}'
    + '.rm-step .rm-ic{font-size:1.2rem;flex-shrink:0}'
    + '.rm-step b{color:#b45309}'
    + '.rm-step .rm-t{font-size:.84rem;font-weight:800;color:#0f172a;margin-bottom:3px;line-height:1.45}'
    + '.rm-step .rm-b{font-size:.78rem;font-weight:600;color:#475569;line-height:1.65}'
    + '.rm-step small{color:#64748b}'
    + '.rm-open{margin:2px 0 12px;width:100%;border:1.5px dashed rgba(249,115,22,.5);background:rgba(249,115,22,.05);color:#b45309;border-radius:12px;padding:11px;font-family:inherit;font-size:.8rem;font-weight:800;cursor:pointer}'
    + '.rm-done{width:100%;border:none;border-radius:14px;padding:14px;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;margin-top:6px}'
    + '.rm-x{width:100%;border:none;background:none;color:#94a3b8;font-family:inherit;font-size:.78rem;font-weight:700;padding:10px;cursor:pointer}';

  function renderCard(slot) {
    var mode = getMode();
    slot.innerHTML = '<div class="rm-card">'
      + (mode === 'home'
        ? '<h4>✈️ 여행 모드 켜기</h4><p>Wi-Fi 통화 + 듀얼심 세팅 4단계 — 한국 번호 전화·인증문자는 그대로, 데이터는 여행 요금으로.</p><button class="rm-btn" data-rm="travel">여행 모드 설정 시작</button>'
        : '<h4>🏠 여행 잘 다녀오셨어요?</h4><p>한국 모드로 3단계 복귀 — 데이터 회선을 되돌리고 여행 eSIM을 정리해요.</p><button class="rm-btn home" data-rm="home">한국 모드로 돌아가기</button>')
      + '</div>';
    slot.querySelector('[data-rm]').addEventListener('click', function () {
      openSheet(this.getAttribute('data-rm'), slot);
    });
  }

  function openSheet(target, slot) {
    var plat = platform();
    track('romi_mode_open', { target: target, platform: plat });
    var s = steps(target, plat);
    var ov = document.createElement('div');
    ov.className = 'rm-ov';
    ov.innerHTML = '<div class="rm-sheet">'
      + '<h3>' + (target === 'travel' ? '✈️ 여행 모드 세팅' : '🏠 한국 모드 복귀') + '</h3>'
      + '<div class="rm-sub">' + ({ ios: 'iPhone', samsung: '갤럭시', android: 'Android', etc: '내 기기' })[plat] + ' 기준 · 위에서부터 순서대로</div>'
      + s.map(function (st) {
          return '<div class="rm-step"><div class="rm-ic">' + st.icon + '</div><div><div class="rm-t">' + st.title + '</div><div class="rm-b">' + st.body + '</div></div></div>';
        }).join('')
      + ((plat === 'android' || plat === 'samsung') ? '<button class="rm-open" data-rm-open>⚙️ 설정 화면 바로 열기 시도</button>' : '')
      + '<button class="rm-done" data-rm-done>' + (target === 'travel' ? '✅ 세팅 완료! 여행 모드 시작' : '✅ 복귀 완료! 수고했어요') + '</button>'
      + '<button class="rm-x" data-rm-x>다음에 할게요</button>'
      + '</div>';
    document.body.appendChild(ov);
    var openBtn = ov.querySelector('[data-rm-open]');
    if (openBtn) openBtn.addEventListener('click', tryOpenSettings);
    ov.querySelector('[data-rm-done]').addEventListener('click', function () {
      setMode(target);
      track('romi_mode_change', { to: target, platform: plat });
      document.body.removeChild(ov);
      renderCard(slot);
    });
    ov.querySelector('[data-rm-x]').addEventListener('click', function () { document.body.removeChild(ov); });
    ov.addEventListener('click', function (e) { if (e.target === ov) document.body.removeChild(ov); });
  }

  function init(opts) {
    if (opts) for (var k in opts) cfg[k] = opts[k];
    var slot = document.getElementById(cfg.slotId);
    if (!slot) return;
    if (!isBuyer()) { slot.style.display = 'none'; return; } // 구매자 전용 게이트
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    renderCard(slot);
    track('romi_mode_shown', { mode: getMode() });
  }

  return { init: init };
})();
