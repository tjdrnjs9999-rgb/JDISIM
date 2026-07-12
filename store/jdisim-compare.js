/* ============================================================
   JDISIM 가격 비교 위젯 v1.0 — "왜 eSIM인가"를 숫자로
   사용법: <div data-jdisim-compare></div> + <script src="jdisim-compare.js" defer>
   기준 금액은 아래 CFG에서 수정 (일 요금 기준)
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    days: 5,                 // 예시 여행 일수
    roamingPerDay: 9900,     // 통신사 데이터로밍 일 요금 (예: 바로 요금제류)
    wifiPerDay: 5500,        // 포켓와이파이 일 대여료 평균
    esimPerDay: 1780,        // JDISIM 일본 5일 무제한 환산가 — 실제 상품가에 맞게 조정
    note: '일본 5일 데이터 무제한 기준 예시 · 통신사/상품별 상이'
  };

  var ITEMS = [
    { name: '통신사 로밍', per: CFG.roamingPerDay, icon: '📡',
      cons: ['속도 제한 구간 잦음', '한국 서버 경유로 느림'] },
    { name: '포켓 와이파이', per: CFG.wifiPerDay, icon: '📶',
      cons: ['공항 수령·반납 필수', '충전기 하나 더 들고 다님', '분실 배상금 위험'] },
    { name: 'JDISIM eSIM', per: CFG.esimPerDay, icon: '🦊', best: true,
      pros: ['QR 스캔 10초 개통', '현지망 다이렉트 속도', '기기 추가 없음·분실 걱정 zero'] }
  ];

  function won(n) { return n.toLocaleString('ko-KR') + '원'; }

  function css() {
    if (document.getElementById('jcpCSS')) return;
    var st = document.createElement('style');
    st.id = 'jcpCSS';
    st.textContent =
      '.jcp{--a:var(--accent,#F2751F);--t:var(--fox-teal,#2BB3A3);--ink:var(--ink-warm,#221510);font-family:inherit}' +
      '.jcp *{box-sizing:border-box}' +
      '.jcp-hd{text-align:center;margin-bottom:16px}' +
      '.jcp-hd b{font-size:1.15rem;font-weight:900;color:var(--ink);letter-spacing:-.01em}' +
      '.jcp-hd span{display:block;font-size:.74rem;color:#94a3b8;font-weight:700;margin-top:4px}' +
      '.jcp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
      '@media(max-width:560px){.jcp-grid{grid-template-columns:1fr;gap:9px}}' +
      '.jcp-card{position:relative;background:#fff;border:1.5px solid #F0E8E0;border-radius:18px;padding:16px 15px;box-shadow:0 4px 14px rgba(34,21,16,.04)}' +
      '.jcp-card.best{border-color:var(--a);box-shadow:0 10px 28px rgba(242,117,31,.16)}' +
      '.jcp-best-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-size:.64rem;font-weight:900;padding:4px 12px;border-radius:999px;white-space:nowrap}' +
      '.jcp-name{font-size:.82rem;font-weight:900;color:var(--ink);display:flex;align-items:center;gap:6px}' +
      '.jcp-price{margin:8px 0 2px;font-size:1.3rem;font-weight:900;color:var(--ink)}' +
      '.jcp-card.best .jcp-price{color:var(--a)}' +
      '.jcp-per{font-size:.68rem;color:#94a3b8;font-weight:700}' +
      '.jcp-list{margin:10px 0 0;padding:10px 0 0;border-top:1px dashed #F0E8E0;list-style:none}' +
      '.jcp-list li{font-size:.72rem;font-weight:700;color:#8B94A7;padding:2.5px 0 2.5px 16px;position:relative}' +
      '.jcp-list li::before{content:"✕";position:absolute;left:0;color:#cbd5e1;font-weight:900}' +
      '.jcp-card.best .jcp-list li{color:#3d4654}' +
      '.jcp-card.best .jcp-list li::before{content:"✓";color:var(--t)}' +
      '.jcp-save{margin-top:14px;text-align:center;background:linear-gradient(135deg,rgba(242,117,31,.08),rgba(245,158,11,.08));border:1px solid rgba(242,117,31,.18);border-radius:14px;padding:12px;font-size:.85rem;font-weight:800;color:var(--ink)}' +
      '.jcp-save em{font-style:normal;color:var(--a);font-weight:900}';
    document.head.appendChild(st);
  }

  function render(el) {
    css();
    var d = CFG.days;
    var cards = ITEMS.map(function (it) {
      var total = it.per * d;
      var list = (it.best ? it.pros : it.cons).map(function (x) { return '<li>' + x + '</li>'; }).join('');
      return '<div class="jcp-card' + (it.best ? ' best' : '') + '">' +
        (it.best ? '<span class="jcp-best-badge">가장 합리적</span>' : '') +
        '<div class="jcp-name"><span>' + it.icon + '</span>' + it.name + '</div>' +
        '<div class="jcp-price">' + won(total) + '</div>' +
        '<div class="jcp-per">' + d + '일 기준 · 일 ' + won(it.per) + '</div>' +
        '<ul class="jcp-list">' + list + '</ul>' +
        '</div>';
    }).join('');
    var savePct = Math.round((1 - CFG.esimPerDay / CFG.roamingPerDay) * 100);
    var saveAmt = (CFG.roamingPerDay - CFG.esimPerDay) * d;
    el.classList.add('jcp');
    el.innerHTML =
      '<div class="jcp-hd"><b>로밍 · 포켓와이파이 · eSIM, 뭐가 이득일까?</b><span>' + CFG.note + '</span></div>' +
      '<div class="jcp-grid">' + cards + '</div>' +
      '<div class="jcp-save">통신사 로밍 대비 <em>최대 ' + savePct + '% (' + won(saveAmt) + ') 절약</em> — 커피 ' + Math.max(1, Math.round(saveAmt / 5000)) + '잔이 남아요 ☕</div>';
  }

  function init() {
    document.querySelectorAll('[data-jdisim-compare]').forEach(render);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
