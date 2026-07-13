/* ============================================================
   ROMI SignalFix v1.0 — "네트워크 초기화 없이" 망 재등록 가이드 (JDISIM 독자기술)
   원리: 로밍 이심 먹통의 90%는 비파트너망 캠핑/등록 꼬임.
        전체 초기화 대신 ①재등록 유도 ②상품별 파트너망 수동선택 ③APN까지
        SKU 맞춤으로 안내 → 와이파이·블루투스 저장정보 보존.
   사용: <div id="sfx"></div>
        RomiSignalFix.mount(document.getElementById('sfx'), { opt: 'JDJ_일본도코모IIJ_매일500MB_05일' });
   해결 단계는 /api/carestat 으로 축적 → 어느 단계가 몇 %를 살리는지 데이터 자산화.
   ============================================================ */
(function () {
  'use strict';
  var API = (window.CARE_API ? window.CARE_API.replace('/api/esim', '/api/carestat')
                             : 'https://jdisim-proxy.vercel.app/api/carestat');
  var MAP = null;

  function loadMap() {
    if (MAP) return Promise.resolve(MAP);
    return fetch('/signal-map.json').then(function (r) { return r.json(); })
      .then(function (j) { MAP = j; return j; })
      .catch(function () { MAP = {}; return MAP; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isIOS() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }

  function css() {
    if (document.getElementById('sfxCSS')) return;
    var st = document.createElement('style'); st.id = 'sfxCSS';
    st.textContent =
      '.sfx{--a:#F2751F;--t:#2BB3A3;font-family:inherit}' +
      '.sfx-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}' +
      '.sfx-hd b{font-size:.95rem;font-weight:900}' +
      '.sfx-sub{font-size:.72rem;color:#8B94A7;font-weight:700;margin-bottom:12px}' +
      '.sfx-step{background:#fff;border:1.5px solid #F0E8E0;border-radius:16px;padding:14px 15px;margin-bottom:9px}' +
      '.sfx-step.done{opacity:.45}' +
      '.sfx-n{display:inline-flex;width:24px;height:24px;border-radius:8px;background:rgba(242,117,31,.1);color:var(--a);font-weight:900;font-size:.78rem;align-items:center;justify-content:center;margin-right:8px}' +
      '.sfx-t{font-size:.86rem;font-weight:900;display:inline}' +
      '.sfx-d{font-size:.78rem;color:#4b5563;font-weight:600;line-height:1.6;margin:7px 0 9px;word-break:keep-all}' +
      '.sfx-d code{background:#FFF3EA;color:#c05a12;padding:1px 6px;border-radius:5px;font-weight:800;font-size:.78rem}' +
      '.sfx-net{display:inline-block;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-weight:900;padding:3px 10px;border-radius:8px;font-size:.8rem}' +
      '.sfx-btns{display:flex;gap:7px}' +
      '.sfx-ok{flex:1;border:none;border-radius:11px;padding:10px;background:rgba(43,179,163,.12);color:#0d8a80;font-family:inherit;font-weight:900;font-size:.78rem;cursor:pointer}' +
      '.sfx-no{flex:1;border:1.5px solid #F0E8E0;border-radius:11px;padding:10px;background:#fff;color:#8B94A7;font-family:inherit;font-weight:800;font-size:.78rem;cursor:pointer}' +
      '.sfx-done{background:linear-gradient(135deg,rgba(43,179,163,.1),rgba(43,179,163,.05));border:1px solid rgba(43,179,163,.3);border-radius:16px;padding:18px;text-align:center;font-weight:900;color:#0d8a80}' +
      '.sfx-esc{background:#FFF8F2;border:1px solid #F0E8E0;border-radius:16px;padding:16px;text-align:center;font-size:.82rem;font-weight:700;color:#4b5563}';
    document.head.appendChild(st);
  }

  function log(opt, step, solved) {
    try {
      var body = JSON.stringify({ opt: String(opt || '').slice(0, 60), step: step, solved: !!solved,
                                  os: isIOS() ? 'ios' : 'android' });
      if (navigator.sendBeacon) navigator.sendBeacon(API, new Blob([body], { type: 'application/json' }));
      else fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body });
    } catch (e) {}
  }

  function steps(info) {
    var ios = isIOS();
    var carrier = info && info.cr ? info.cr : '현지 제휴 통신사';
    var apn = info && info.apn ? info.apn : '';
    var path = ios ? '설정 → 셀룰러' : '설정 → 연결(네트워크)';
    var list = [
      { t: '데이터 로밍 확인', d: '<code>' + path + '</code> → 여행 eSIM 회선 → <b>데이터 로밍 ON</b>인지 확인해요. (한국 유심이 아니라 <b>여행 회선</b>에서!)' },
      { t: '비행기 모드 10초', d: '비행기 모드를 켜고 <b>10초</b> 뒤 끄면 현지망에 다시 등록을 시도해요. 와이파이·블루투스 정보는 그대로예요.' },
      { t: 'eSIM 회선 껐다 켜기', d: '<code>' + path + '</code>에서 여행 eSIM 회선을 <b>끄고 5초 뒤 다시 켜요</b>. 회선 삭제가 아니라 토글이에요 — 삭제는 절대 금지!' },
      { t: '네트워크 수동 선택 ⭐', d: '이 상품은 <span class="sfx-net">' + esc(carrier) + '</span> 망에서 동작해요.<br><code>' +
          (ios ? '설정 → 셀룰러 → (여행 회선) → 네트워크 선택 → 자동 OFF' : '설정 → 연결 → 모바일 네트워크 → 네트워크 사업자 → 자동 해제') +
          '</code> 후 위 통신사를 직접 선택하세요. <b>먹통의 대부분이 여기서 해결</b>돼요 — 전체 초기화가 하던 일이 사실 이거예요.' },
    ];
    if (apn) list.push({ t: 'APN 확인', d: 'APN이 <code>' + esc(apn) + '</code> 인지 확인하고, 다르면 수정 후 저장하세요. (' +
      (ios ? '설정 → 셀룰러 → 회선 → 셀룰러 데이터 네트워크' : '설정 → 연결 → 모바일 네트워크 → 액세스 포인트 이름') + ')' });
    return list;
  }

  function mount(el, opts) {
    opts = opts || {};
    css();
    loadMap().then(function (m) {
      var opt = String(opts.opt || '');
      var prefix = (opt.split('_')[0] || '').toUpperCase();
      var info = m[prefix] || null;
      var S = steps(info);
      el.classList.add('sfx');
      el.innerHTML =
        '<div class="sfx-hd"><span style="font-size:1.2rem">📶</span><b>시그널 리셋' + (info ? ' — ' + esc(info.c) : '') + '</b></div>' +
        '<div class="sfx-sub">전체 네트워크 초기화 없이(와이파이 보존) 망만 다시 잡아요 · 위에서부터 하나씩</div>' +
        '<div class="sfx-list">' + S.map(function (s, i) {
          return '<div class="sfx-step" data-i="' + i + '"><span class="sfx-n">' + (i + 1) + '</span><span class="sfx-t">' + s.t + '</span>' +
            '<div class="sfx-d">' + s.d + '</div>' +
            '<div class="sfx-btns"><button class="sfx-ok">✅ 해결됐어요</button><button class="sfx-no">아직이에요 →</button></div></div>';
        }).join('') + '</div>' +
        '<div class="sfx-esc" style="display:none">모든 단계를 해봤는데도 안 되면 로미가 직접 볼게요 — 아래 <b>로미 닥터 1:1</b>로 바로 연결해 주세요. 지금까지 시도한 단계는 이미 기록돼 있어요.</div>';

      var stepsEl = el.querySelectorAll('.sfx-step');
      stepsEl.forEach(function (box, i) {
        box.querySelector('.sfx-ok').onclick = function () {
          log(opt, i + 1, true);
          el.querySelector('.sfx-list').innerHTML =
            '<div class="sfx-done">🎉 해결! ' + (i + 1) + '단계(' + esc(S[i].t) + ')가 살렸어요.<br>' +
            '<span style="font-size:.74rem;font-weight:700;color:#4b5563">같은 증상이 또 오면 이 단계부터 바로 하시면 돼요.</span></div>';
        };
        box.querySelector('.sfx-no').onclick = function () {
          log(opt, i + 1, false);
          box.classList.add('done');
          box.querySelector('.sfx-btns').style.display = 'none';
          var next = stepsEl[i + 1];
          if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
          else el.querySelector('.sfx-esc').style.display = '';
        };
      });
    });
  }

  window.RomiSignalFix = { mount: mount };
})();
