// jd-devices.js — eSIM 기종 호환성 데이터 정본 + 클릭형 진단 위젯 (2026-07-17)
// 정본 규칙: 기종 DB는 이 파일이 유일한 원본. app.js(DIAG_BRAND_MODELS)·체크아웃 섹션(PC/모바일) 모두 window.JD_DEVICES를 참조한다.
// index.html·mobile.html에서 app.js보다 먼저 로드할 것.
(function () {
  'use strict';

  window.JD_DEVICES = {
    Apple: [
      // iPhones
      { name: "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max", status: "success" },
      { name: "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max", status: "success" },
      { name: "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max", status: "success" },
      { name: "iPhone 13 / 13 mini / 13 Pro / 13 Pro Max", status: "success" },
      { name: "iPhone 12 / 12 mini / 12 Pro / 12 Pro Max", status: "success" },
      { name: "iPhone 11 / 11 Pro / 11 Pro Max", status: "success" },
      { name: "iPhone XS / XS Max / XR", status: "success" },
      { name: "iPhone SE (3세대 - 2022)", status: "success" },
      { name: "iPhone SE (2세대 - 2020)", status: "success" },
      { name: "iPhone X / 8 / 8 Plus 및 이전 모든 기종", status: "danger", note: "아이폰 X, 8, 7, 6s, SE 1세대 이하 구형 기종들은 메인보드 내부에 eSIM 전용 하드웨어 칩(eUICC)이 내장되어 있지 않아 사용이 완전히 불가능합니다. 유심(USIM) 상품을 구매해 주세요." },
      // iPads
      { name: "iPad Pro 11-inch (1세대 ~ 4세대) [셀룰러 모델]", status: "success" },
      { name: "iPad Pro 12.9-inch (3세대 ~ 6세대) [셀룰러 모델]", status: "success" },
      { name: "iPad Air (3세대 ~ 5세대) [셀룰러 모델]", status: "success" },
      { name: "iPad mini (5세대 ~ 6세대) [셀룰러 모델]", status: "success" },
      { name: "iPad (7세대 ~ 10세대) [셀룰러 모델]", status: "success" },
      { name: "iPad (모든 WiFi 전용 기종 - 심 카드 슬롯 없음)", status: "danger", note: "와이파이 전용 아이패드는 무선 셀룰러 통신 모듈 및 물리 심/이심 슬롯이 전혀 장착되어 있지 않아 개통이 불가합니다." }
    ],
    Samsung: [
      // Flagships (S Series)
      { name: "Galaxy S24 / S24+ / S24 Ultra", status: "success" },
      { name: "Galaxy S23 / S23+ / S23 Ultra / S23 FE", status: "success" },
      { name: "Galaxy S22 / S22+ / S22 Ultra (국내 정식 발매판)", status: "danger", note: "국내에 정식 발매된 갤럭시 S22 시리즈는 하드웨어 칩셋 상 eSIM 기능이 차단되어 사용이 불가능합니다. 해외 직구폰인 경우에만 제한적으로 지원할 수 있으니 EID 조회를 진행하세요." },
      { name: "Galaxy S22 / S22+ / S22 Ultra (해외 직구판)", status: "warning", note: "해외 사양 단말기인 경우 국가/버전에 따라 일부 eSIM 부품이 탑재되어 있을 수 있습니다. 다이얼러에서 *#06#를 입력하여 EID가 정상 표시되는지 대조해 주시기 바랍니다." },
      { name: "Galaxy S21 / S21+ / S21 Ultra / S21 FE (국내 정식 발매판)", status: "danger", note: "갤럭시 S21 시리즈 국내판은 eSIM을 탑재하고 있지 않습니다." },
      { name: "Galaxy S21 / S21+ / S21 Ultra / S21 FE (해외 직구판)", status: "warning", note: "해외판 기기는 국가 사양에 따라 지원 여부가 달라지므로 다이얼러에서 *#06# 후 EID 조회가 요구됩니다." },
      { name: "Galaxy S20 / S20+ / S20 Ultra (국내 정식 발매판)", status: "danger", note: "갤럭시 S20 시리즈 국내판은 eSIM을 탑재하고 있지 않습니다." },
      { name: "Galaxy S20 / S20+ / S20 Ultra (해외 직구판)", status: "warning", note: "해외판 기기는 국가 사양에 따라 지원 여부가 달라지므로 다이얼러에서 *#06# 후 EID 조회가 요구됩니다." },
      // Foldables (Z Series)
      { name: "Galaxy Z Flip 6 / Z Fold 6", status: "success" },
      { name: "Galaxy Z Flip 5 / Z Fold 5", status: "success" },
      { name: "Galaxy Z Flip 4 / Z Fold 4", status: "success" },
      { name: "Galaxy Z Flip 3 / Z Fold 3 및 이전 구형 폴더블", status: "danger", note: "Z플립3, Z폴드3 이하 기종들은 국내판과 해외판 모두 eSIM 부품을 탑재하지 않았습니다. 유심 상품을 이용해 주세요." },
      // Mid-range (A Series & Quantum)
      { name: "Galaxy A25 5G / A35 5G / A55 5G (국내 정발판)", status: "success" },
      { name: "Galaxy A15 / A24 / A34 / A54 (국내 정발판)", status: "danger", note: "삼성 보급형 A시리즈 모델 중 국내 정식 유통된 모델들은 A25, A35, A55 기종만 이심을 탑재하였습니다. 그 외 A시리즈는 이심 하드웨어가 내장되어 있지 않습니다." },
      { name: "Galaxy Quantum 4 (SKT 전용)", status: "success" },
      { name: "Galaxy Quantum 1 / 2 / 3 (SKT 전용)", status: "danger", note: "양자보안 라인업 중 퀀텀 4 기종을 제외한 이전 모든 모델은 이심 미탑재 단말기입니다." },
      // Notes
      { name: "Galaxy Note 20 / Note 20 Ultra (국내 정식 발매판)", status: "danger", note: "국내판 노트 20 시리즈는 이심을 전혀 지원하지 않습니다." },
      { name: "Galaxy Note 20 / Note 20 Ultra (해외 직구판)", status: "warning", note: "해외 직구폰인 경우 미국/유럽/홍콩 버전의 사양에 따라 이심 칩셋이 있을 수 있으니 EID를 검증해 주세요." },
      { name: "Galaxy Note 10 / Note 10+ 및 이전 노트 기종", status: "danger", note: "노트 10 이하 모델들은 국내/해외 사양 전체 eSIM 미지원 기기입니다." },
      // Tablets (Tab Series)
      { name: "Galaxy Tab S9 / S9+ / S9 Ultra / S9 FE / S9 FE+ [셀룰러 모델]", status: "success" },
      { name: "Galaxy Tab S8 / S8+ / S8 Ultra [셀룰러 모델]", status: "success" },
      { name: "Galaxy Tab (모든 WiFi 전용 기종 - 심 카드 슬롯 없음)", status: "danger", note: "와이파이 단독 아이패드/갤럭시탭은 네트워크 기능이 무선랜(WiFi) 전용으로 국한되어 eSIM을 사용할 수 없습니다." }
    ],
    Google: [
      { name: "Pixel 9 / 9 Pro / 9 Pro XL / 9 Pro Fold", status: "success" },
      { name: "Pixel 8 / 8 Pro / 8a", status: "success" },
      { name: "Pixel 7 / 7 Pro / 7a", status: "success" },
      { name: "Pixel 6 / 6 Pro / 6a", status: "success" },
      { name: "Pixel 5 / 5a 5G", status: "success" },
      { name: "Pixel 4 / 4 XL / 4a / 4a 5G", status: "success" },
      { name: "Pixel 3 / 3 XL / 3a / 3a XL", status: "danger", note: "구글 픽셀 3 시리즈 이하 구형 모델은 국내 이동통신 규격 상 eSIM 추가 및 개통이 제한되어 있습니다. 유심 사용을 권장합니다." }
    ],
    Others: [
      // Xiaomi
      { name: "샤오미 Xiaomi 15 / 15 Pro / 15 Ultra (해외판)", status: "success" },
      { name: "샤오미 Xiaomi 14 / 14 Pro / 14 Ultra / 14T / 14T Pro (해외판)", status: "success" },
      { name: "샤오미 Xiaomi 13 / 13 Pro / 13 Ultra / 13 Lite (해외판)", status: "success" },
      { name: "샤오미 Xiaomi 12T Pro (해외판)", status: "success" },
      { name: "샤오미 Redmi Note (홍미노트) 시리즈 국내 정식 정발판 전체", status: "danger", note: "국내에 정식 출시된 모든 홍미노트 단말은 eSIM 기능이 빠져 있습니다. 유심을 구매해 주세요." },
      // Oppo & OnePlus
      { name: "오포 Oppo Find X5 / Find X5 Pro (해외판)", status: "success" },
      { name: "오포 Oppo Find X3 Pro / Reno 6 Pro 5G / Reno 5 A (해외판)", status: "success" },
      { name: "원플러스 OnePlus 12 / 12R / 11 / Open (해외판)", status: "success" },
      // Motorola
      { name: "모토로라 Razr 50 / 40 / 40 Ultra / 2022 (해외판)", status: "success" },
      { name: "모토로라 Edge 50 / 40 / 40 Pro / 30 Neo (해외판)", status: "success" },
      // Sony
      { name: "소니 Xperia 1 VI / 1 V / 1 IV (해외판)", status: "success" },
      { name: "소니 Xperia 5 V / 5 IV / 10 VI / 10 V / 10 IV (해외판)", status: "success" },
      // Huawei
      { name: "화웨이 P40 / P40 Pro / Mate 40 Pro (해외판)", status: "success" },
      // LG
      { name: "LG Wing / Velvet / G8 / V50 등 LG 스마트폰 전 모델", status: "danger", note: "LG전자 모바일 사업부에서 생산하고 유통했던 모든 기종은 eSIM 하드웨어 장치를 설계하지 않아 가상 이심 사용이 원천 불가합니다. 유심 상품을 구매하셔야 합니다." },
      // Global/Fuzzy 직구폰
      { name: "기타 외산폰 (샤오미/오포/모토로라/소니 등) 해외 직구 단말기 전체", status: "warning", note: "직구하신 국가와 세부 하드웨어 일련번호 버전에 따라 eSIM 칩셋 장착 여부가 천차만별입니다. 구매하시기 전에 팁 아코디언의 EID 확인법을 통해 EID가 나타나는지 반드시 자가 확인해 주세요." }
    ]
  };

  var BRAND_LABEL = { Apple: '🍎 아이폰·아이패드', Samsung: '📱 갤럭시', Google: '🇬 픽셀', Others: '🌐 기타·직구폰' };
  var VERDICT = {
    success: { icon: '✅', title: '이심 사용 가능!', color: '#16a34a', bg: 'rgba(22,163,74,0.08)', bd: 'rgba(22,163,74,0.35)', defNote: '이 기종은 eSIM을 정식 지원해요. 안심하고 구매하세요 — 설치는 QR 스캔 1분이면 끝나요.' },
    warning: { icon: '⚠️', title: 'EID 확인 필요 (기기마다 달라요)', color: '#d97706', bg: 'rgba(217,119,6,0.08)', bd: 'rgba(217,119,6,0.35)', defNote: '전화 키패드에 *#06# 을 입력해 32자리 EID가 보이면 사용 가능해요.' },
    danger: { icon: '❌', title: '이심 사용 불가', color: '#dc2626', bg: 'rgba(220,38,38,0.07)', bd: 'rgba(220,38,38,0.32)', defNote: '이 기종은 eSIM 하드웨어가 없어요. 유심(USIM) 상품을 이용해 주세요.' }
  };
  function esch(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // 클릭형 기종 진단 섹션 — 체크아웃(PC·모바일) 공용
  // container: 삽입 대상 요소. 접힌 details로 렌더 → 펼치면 브랜드 탭 + 모델 버튼 목록 + 판정 카드
  window.jdRenderDeviceCheck = function (container) {
    if (!container || !window.JD_DEVICES) return;
    var uid = 'jdc' + Math.random().toString(36).slice(2, 7);
    var brands = Object.keys(window.JD_DEVICES);
    container.innerHTML =
      '<details id="' + uid + '" style="margin:12px 0;border:1.5px solid rgba(43,179,163,0.35);border-radius:14px;background:linear-gradient(135deg,rgba(43,179,163,0.05),rgba(43,179,163,0.02));overflow:hidden;">'
      + '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:13px 15px;-webkit-tap-highlight-color:transparent;">'
      +   '<span style="font-size:1.25rem;flex-shrink:0;">📲</span>'
      +   '<span style="flex:1;min-width:0;"><b style="display:block;font-size:0.9rem;color:#0f766e;">내 폰, 이심 될까요? — 기종 눌러서 3초 확인</b>'
      +   '<span style="display:block;font-size:0.73rem;font-weight:600;color:#6b7f7c;margin-top:2px;">결제 전에 꼭! 내 휴대폰을 직접 클릭해서 확인하세요</span></span>'
      +   '<span data-jdc-arrow style="flex-shrink:0;font-size:0.8rem;color:#2BB3A3;transition:transform 0.2s;">▼</span>'
      + '</summary>'
      + '<div style="padding:4px 12px 12px;">'
      +   '<div data-jdc-tabs style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 9px;-webkit-overflow-scrolling:touch;scrollbar-width:none;"></div>'
      +   '<div data-jdc-verdict></div>'
      +   '<div data-jdc-list style="max-height:236px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:7px;background:rgba(255,255,255,0.6);"></div>'
      +   '<div style="margin-top:8px;font-size:0.7rem;font-weight:600;color:#8a9693;line-height:1.6;">💡 내 기종이 목록에 없다면? 전화 키패드에 <b style="font-family:monospace;color:#0f766e;">*#06#</b> 입력 → 32자리 <b>EID</b>가 보이면 사용 가능한 기기예요.</div>'
      + '</div></details>';

    var root = container.querySelector('#' + uid);
    var tabsEl = root.querySelector('[data-jdc-tabs]');
    var listEl = root.querySelector('[data-jdc-list]');
    var verdictEl = root.querySelector('[data-jdc-verdict]');
    var arrowEl = root.querySelector('[data-jdc-arrow]');
    root.addEventListener('toggle', function () { if (arrowEl) arrowEl.style.transform = root.open ? 'rotate(180deg)' : ''; });

    var curBrand = brands[0];
    function renderTabs() {
      tabsEl.innerHTML = brands.map(function (b) {
        var on = b === curBrand;
        return '<button type="button" data-jdc-brand="' + b + '" style="flex-shrink:0;border:1.5px solid ' + (on ? '#2BB3A3' : 'rgba(0,0,0,0.12)') + ';background:' + (on ? 'linear-gradient(135deg,#2BB3A3,#1B8E82)' : '#fff') + ';color:' + (on ? '#fff' : '#4b5563') + ';font-family:inherit;font-size:0.78rem;font-weight:800;padding:8px 13px;border-radius:20px;cursor:pointer;white-space:nowrap;">' + BRAND_LABEL[b] + '</button>';
      }).join('');
    }
    function renderList() {
      listEl.innerHTML = window.JD_DEVICES[curBrand].map(function (d, i) {
        var v = VERDICT[d.status] || VERDICT.warning;
        return '<button type="button" data-jdc-model="' + i + '" style="display:flex;align-items:center;gap:8px;border:1px solid rgba(0,0,0,0.07);background:#fff;font-family:inherit;font-size:0.78rem;font-weight:700;color:#374151;text-align:left;padding:9px 11px;border-radius:9px;cursor:pointer;line-height:1.4;">'
          + '<span style="width:8px;height:8px;border-radius:50%;background:' + v.color + ';flex-shrink:0;"></span>'
          + '<span style="flex:1;min-width:0;">' + esch(d.name) + '</span></button>';
      }).join('');
    }
    function showVerdict(d, btn) {
      var v = VERDICT[d.status] || VERDICT.warning;
      verdictEl.innerHTML =
        '<div style="margin:0 0 9px;padding:12px 13px;border:1.5px solid ' + v.bd + ';border-radius:11px;background:' + v.bg + ';">'
        + '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.15rem;">' + v.icon + '</span>'
        + '<b style="flex:1;font-size:0.86rem;color:' + v.color + ';">' + v.title + '</b></div>'
        + '<div style="font-size:0.76rem;font-weight:700;color:#374151;margin-top:6px;">' + esch(d.name) + '</div>'
        + '<div style="font-size:0.74rem;font-weight:600;color:#5b6672;margin-top:4px;line-height:1.65;">' + esch(d.note || v.defNote) + '</div></div>';
      listEl.querySelectorAll('[data-jdc-model]').forEach(function (b) { b.style.borderColor = 'rgba(0,0,0,0.07)'; b.style.background = '#fff'; });
      if (btn) { btn.style.borderColor = v.color; btn.style.background = v.bg; }
      try { verdictEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
    root.addEventListener('click', function (e) {
      var bb = e.target.closest('[data-jdc-brand]');
      if (bb) { curBrand = bb.getAttribute('data-jdc-brand'); verdictEl.innerHTML = ''; renderTabs(); renderList(); return; }
      var mb = e.target.closest('[data-jdc-model]');
      if (mb) showVerdict(window.JD_DEVICES[curBrand][Number(mb.getAttribute('data-jdc-model'))], mb);
    });
    renderTabs();
    renderList();
  };
})();
