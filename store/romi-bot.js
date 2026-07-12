/* ============================================================
   JDISIM 로미 챗봇 (romi-bot.js) — PC/모바일 공용, 의존성 0
   기능: 설치 안내 · 사용량 조회(이름+전화) · 리셋 시간 · 유효기간/환불
         기기 확인 · 국가 요금 즉답(productsData 연동) · 카톡 상담 자동작성
   ============================================================ */
(function () {
  'use strict';
  if (window.__romiBot) return; window.__romiBot = 1;

  var KAKAO = 'https://pf.kakao.com/_GSixcn/chat';
  var CARE = window.CARE_API || 'https://jdisim-proxy.vercel.app/api/esim';
  var isMobilePage = /mobile\.html/.test(location.pathname) || document.querySelector('.bottom-nav');
  var BOTTOM = isMobilePage ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '24px';

  var RESET = { '일본':'새벽 1시','한국':'새벽 1시','베트남':'밤 11시','태국':'밤 11시','라오스':'밤 11시','캄보디아':'밤 11시','중국':'자정','대만':'자정','필리핀':'자정','싱가포르':'자정','말레이시아':'자정','홍콩':'자정','마카오':'자정','몰디브':'밤 9시','괌':'새벽 2시','사이판':'새벽 2시','호주':'새벽 2시','뉴질랜드':'새벽 4시','미국':'서부 08:00 · 동부 11:00' };

  // ---------- 스타일 ----------
  var css = document.createElement('style');
  css.textContent =
    '#rbFab{position:fixed;right:16px;bottom:' + BOTTOM + ';z-index:99900;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#F97316,#F59E0B);box-shadow:0 10px 26px rgba(249,115,22,0.45);display:flex;align-items:center;justify-content:center;transition:transform .2s;}' +
    '#rbFab:active{transform:scale(.92)}#rbFab img{width:38px;height:38px;object-fit:contain;pointer-events:none;}' +
    '#rbFab .rb-badge{position:absolute;top:-4px;right:-2px;background:#0f172a;color:#fff;font-size:.56rem;font-weight:800;padding:3px 7px;border-radius:9px;font-family:Pretendard,sans-serif;}' +
    '#rbPanel{position:fixed;right:12px;bottom:calc(' + BOTTOM + ' + 68px);z-index:99901;width:min(360px,calc(100vw - 24px));max-height:min(560px,70vh);background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,0.3);display:none;flex-direction:column;overflow:hidden;font-family:Pretendard,"Apple SD Gothic Neo",sans-serif;}' +
    '#rbPanel.on{display:flex;animation:rbUp .28s cubic-bezier(.2,.9,.3,1) both;}@keyframes rbUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
    '.rb-hd{display:flex;align-items:center;gap:10px;padding:13px 15px;background:linear-gradient(120deg,#101623,#25314F);}' +
    '.rb-hd img{width:36px;height:36px;object-fit:contain;}.rb-hd b{color:#fff;font-size:.92rem;font-weight:900;}.rb-hd span{display:block;color:#8FA3D9;font-size:.66rem;font-weight:700;margin-top:1px;}' +
    '.rb-x{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);background:none;color:#fff;font-weight:900;cursor:pointer;}' +
    '.rb-body{flex:1;overflow-y:auto;padding:14px;background:#FAF8F4;display:flex;flex-direction:column;gap:9px;}' +
    '.rb-msg{max-width:86%;padding:11px 13px;border-radius:15px;font-size:.82rem;font-weight:600;line-height:1.65;white-space:pre-wrap;word-break:keep-all;}' +
    '.rb-msg.bot{align-self:flex-start;background:#fff;border:1px solid #ECE8E0;border-radius:15px 15px 15px 4px;color:#1e293b;}' +
    '.rb-msg.me{align-self:flex-end;background:#F97316;color:#fff;border-radius:15px 15px 4px 15px;}' +
    '.rb-msg a{color:#F2751F;font-weight:800;}' +
    '.rb-chips{display:flex;flex-wrap:wrap;gap:7px;}' +
    '.rb-chip{border:1.5px solid #E4E8EF;background:#fff;border-radius:16px;padding:9px 13px;font-size:.74rem;font-weight:800;color:#334155;cursor:pointer;font-family:inherit;}' +
    '.rb-chip:active{transform:scale(.96)}' +
    '.rb-form{display:flex;gap:6px;}.rb-form input{flex:1;min-width:0;height:42px;border:1.5px solid #E4E8EF;border-radius:11px;padding:0 12px;font-size:.8rem;font-weight:600;font-family:inherit;outline:none;}' +
    '.rb-form input:focus{border-color:#F97316;}.rb-form button{flex-shrink:0;height:42px;padding:0 14px;border:none;border-radius:11px;background:#F97316;color:#fff;font-weight:800;font-size:.78rem;cursor:pointer;font-family:inherit;}' +
    '.rb-ft{display:flex;gap:7px;padding:11px 13px;border-top:1px solid #EFF2F6;background:#fff;}' +
    '.rb-ft input{flex:1;min-width:0;height:44px;border:1.5px solid #E4E8EF;border-radius:13px;padding:0 13px;font-size:.82rem;font-weight:600;font-family:inherit;outline:none;}' +
    '.rb-ft input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,0.12);}' +
    '.rb-ft button{flex-shrink:0;width:44px;height:44px;border:none;border-radius:13px;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-weight:900;cursor:pointer;font-size:1rem;}';
  document.head.appendChild(css);

  // ---------- 마크업 ----------
  var fab = document.createElement('button');
  fab.id = 'rbFab'; fab.setAttribute('aria-label', '로미에게 물어보기');
  fab.innerHTML = '<img src="images/fox-hello.png" alt="" onerror="this.outerHTML=\'🦊\'"><span class="rb-badge">로미</span>';
  var panel = document.createElement('div');
  panel.id = 'rbPanel';
  panel.innerHTML =
    '<div class="rb-hd"><img src="images/fox-hello.png" alt="" onerror="this.remove()"><div><b>로미</b><span>JDISIM 여행 도우미 · 바로 답해드려요</span></div><button class="rb-x" aria-label="닫기">✕</button></div>' +
    '<div class="rb-body" id="rbBody"></div>' +
    '<div class="rb-ft"><input id="rbInput" placeholder="궁금한 걸 물어보세요 (예: 일본 요금)"><button id="rbSend">↑</button></div>';
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body = panel.querySelector('#rbBody');
  function scrollDn(){ body.scrollTop = body.scrollHeight; }
  function bot(html){ var d = document.createElement('div'); d.className = 'rb-msg bot'; d.innerHTML = html; body.appendChild(d); scrollDn(); return d; }
  function me(t){ var d = document.createElement('div'); d.className = 'rb-msg me'; d.textContent = t; body.appendChild(d); scrollDn(); }
  function chips(list){
    var w = document.createElement('div'); w.className = 'rb-chips';
    list.forEach(function(c){
      var b = document.createElement('button'); b.className = 'rb-chip'; b.textContent = c[0];
      b.onclick = function(){ me(c[0]); c[1](); };
      w.appendChild(b);
    });
    body.appendChild(w); scrollDn();
  }

  function homeChips(){
    chips([
      ['📲 설치 방법', aInstall],
      ['📊 내 사용량 조회', aUsage],
      ['↻ 데이터 리셋 시간', aReset],
      ['🗓️ 유효기간 · 환불', aValid],
      ['📱 내 기종 되나요?', aDevice],
      ['💬 상담원 연결', aAgent]
    ]);
  }

  // ---------- 답변들 ----------
  function aInstall(){
    bot('설치는 <strong>3가지 중 편한 방법</strong> 하나면 돼요!\n\n① <strong>원클릭</strong> — 발급 카톡의 [내 티켓 열기] → 설치 탭에서 버튼 한 번 (아이폰·갤럭시 모두 지원)\n② <strong>QR 스캔</strong> — 다른 기기에 QR 띄우고 설정 → eSIM 추가 → 스캔\n③ <strong>수동 입력</strong> — SM-DP 주소와 활성화 코드 복사-붙여넣기\n\n💡 설치는 와이파이에서, <strong>사용일은 현지 도착 후</strong> 신호를 잡는 순간부터 시작돼요. 미리 설치해도 안심!');
    homeChips();
  }
  function aReset(){
    bot('일 용량 상품(매일 ○GB)은 <strong>매일 정해진 현지 시간</strong>에 고속 데이터가 새로 채워져요 ↻\n\n' +
      '🇯🇵 일본 새벽 1시 · 🇻🇳 베트남/태국 밤 11시 · 🇹🇼 대만/싱가포르 자정 · 🇬🇺 괌/사이판 새벽 2시 · 🇳🇿 뉴질랜드 새벽 4시 · 🇲🇻 몰디브 밤 9시\n\n다른 나라가 궁금하면 나라 이름을 입력해 보세요!');
    homeChips();
  }
  function aValid(){
    bot('🗓️ <strong>유효기간</strong>\n구매일로부터 <strong>30일 이내</strong>(베트남 상품은 15일) 현지에서 활성화해 주세요. 기간이 지나면 만료돼요.\n\n💰 <strong>환불</strong>\n· 발급(QR 발송) <strong>전</strong>: 100% 환불 가능\n· 발급 <strong>후</strong>: 교환·환불 불가 (통신사 정책)\n\n애매한 상황이면 상담으로 확인해 드릴게요!');
    homeChips();
  }
  function aDevice(){
    bot('가장 확실한 확인법: 키패드에 <strong>*#06#</strong> 입력 → <strong>EID</strong>(32자리)가 보이면 eSIM 지원 기종이에요! ✅\n\n· 아이폰: XS/XR(2018) 이후 전 기종 (SE1·X 제외)\n· 갤럭시: S23 이후 전 기종, Z폴드4/플립4 이후 (국내판 S22 이하 미지원)\n· 중국 본토 구매 아이폰은 최신 기종도 막혀 있어요 ⚠️\n\n애매하면 기종명을 알려주세요 — 상담으로 바로 확인해 드릴게요.');
    homeChips();
  }
  // 상담 접수: 연락처를 남기면 관리자 인박스로 저장 → 콜백 (카톡은 병행 채널)
  function aInbox(pre){
    var d = bot('상담원이 <strong>먼저 연락</strong>드릴 수도 있어요. 연락처와 내용을 남겨주세요 📮');
    var f = document.createElement('div'); f.className = 'rb-form';
    f.innerHTML = '<input id="rbIp" type="tel" placeholder="전화번호" style="max-width:118px;"><input id="rbIq" placeholder="문의 내용"><button>접수</button>';
    body.appendChild(f); scrollDn();
    if (pre) f.querySelector('#rbIq').value = pre;
    f.querySelector('button').onclick = function(){
      var ph = f.querySelector('#rbIp').value.replace(/[^0-9]/g, '');
      var q = f.querySelector('#rbIq').value.trim();
      if (ph.length < 10 || !q) { bot('전화번호와 문의 내용을 모두 입력해 주세요!'); return; }
      me(q);
      fetch(CARE.replace('/api/esim', '/api/support'), { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ph, msg: q, from: isMobilePage ? 'mobile' : 'pc', at: new Date().toISOString() }) })
        .then(function(r){ if (!r.ok) throw 0;
          bot('✅ 접수됐어요! 순서대로 연락드릴게요.\n급하시면 카톡이 더 빨라요 → <a href="' + KAKAO + '" target="_blank" rel="noopener">💬 카톡 상담</a>'); homeChips(); })
        .catch(function(){ bot('접수 서버가 잠시 쉬는 중이에요 — 카톡으로 바로 연결해 드릴게요!\n<a href="' + KAKAO + '" target="_blank" rel="noopener">💬 카톡 상담 열기 →</a>'); homeChips(); });
    };
  }
  function aAgent(pre){
    var msg = '[JDISIM 상담 요청]' + (pre ? '\n문의: ' + pre : '') + '\n경로: ' + (isMobilePage ? '모바일' : 'PC') + ' 챗봇';
    var copied = false;
    try { navigator.clipboard.writeText(msg); copied = true; } catch (e) {}
    bot('상담원(로미 닥터 🩺)을 연결해 드릴게요!\n' + (copied ? '문의 내용이 <strong>복사</strong>됐어요 — 채팅창에 붙여넣기만 해주세요.' : '') +
      '\n\n<a href="' + KAKAO + '" target="_blank" rel="noopener">💬 카톡 상담 바로 열기 →</a>\n연중무휴 · 평균 응답 5분 이내');
    chips([['📮 연락처 남기고 콜백 받기', function(){ aInbox(pre || ''); }]]);
    homeChips();
  }

  // 사용량 조회 (이름+전화)
  function aUsage(){
    var d = bot('구매하신 <strong>이름과 전화번호</strong>를 입력하면 바로 조회해 드릴게요! 🔎');
    var f = document.createElement('div'); f.className = 'rb-form';
    f.innerHTML = '<input id="rbNm" placeholder="이름" style="max-width:88px;"><input id="rbPh" type="tel" placeholder="01012345678"><button>조회</button>';
    body.appendChild(f); scrollDn();
    f.querySelector('button').onclick = function(){
      var nm = f.querySelector('#rbNm').value.trim();
      var ph = f.querySelector('#rbPh').value.replace(/[^0-9]/g, '');
      if (ph.length < 10) { bot('전화번호를 확인해 주세요! (예: 01012345678)'); return; }
      me((nm ? nm + ' · ' : '') + ph.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-****-$3'));
      var w = bot('🦊 ' + (nm ? nm + ' 님의 ' : '') + 'eSIM을 찾고 있어요…');
      fetch(CARE + '?action=history&phone=' + encodeURIComponent(ph))
        .then(function(r){ if (!r.ok) throw 0; return r.json(); })
        .then(function(dd){
          var list = dd && (dd.esims || dd.list || dd.orders || dd.history || (Array.isArray(dd) ? dd : []));
          if (!list || !list.length) throw 1;
          var pick = null;
          for (var i = list.length - 1; i >= 0; i--) { if (list[i] && (list[i].iccid || list[i].ICCID)) { pick = list[i]; break; } }
          if (!pick) throw 1;
          var iccid = String(pick.iccid || pick.ICCID);
          return fetch(CARE + '?action=usage&iccid=' + encodeURIComponent(iccid))
            .then(function(r){ if (!r.ok) throw 0; return r.json(); })
            .then(function(u){
              var L = (u && (u.usageList || u.daily || u.list)) || [];
              var tot = 0; L.forEach(function(x){ tot += Number(x.used || x.used_mb || 0); });
              if (u && u.used_mb !== undefined) tot = Number(u.used_mb) || tot;
              var gb = (Math.round(tot / 1024 * 10) / 10) + 'GB';
              var prod = pick.prodName || pick.Option || pick.option || '';
              var care = 'https://jdisim.co.kr/issue.html?care=' + encodeURIComponent(iccid) + (prod ? '&plan=' + encodeURIComponent(prod) : '');
              w.innerHTML = '✅ 찾았어요!' + (prod ? '\n<strong>' + prod + '</strong>' : '') +
                '\n누적 사용: <strong style="color:#F2751F;">' + gb + '</strong>' +
                (L.length ? '\n최근: ' + L.slice(-2).reverse().map(function(x){ return (x.date || '') + ' ' + (Math.round(Number(x.used || x.used_mb || 0) / 1024 * 10) / 10) + 'GB'; }).join(' · ') : '') +
                '\n\n<a href="' + care + '" target="_blank" rel="noopener">🎫 내 티켓 열기 →</a>  ·  <a href="https://jdisim.co.kr/mobile.html" target="_blank" rel="noopener">➕ 연장 eSIM 보기</a>';
              homeChips();
            });
        })
        .catch(function(){
          w.innerHTML = '해당 번호로 등록된 eSIM을 못 찾았어요 😢\n구매 시 번호가 맞는지 확인하시거나, 발급 카톡의 <strong>내 티켓 열기</strong>에서 바로 볼 수 있어요.\n\n<a href="' + KAKAO + '" target="_blank" rel="noopener">💬 상담으로 찾아드릴게요 →</a>';
          homeChips();
        });
    };
  }

  // 국가 요금 즉답 (페이지의 productsData 활용)
  function priceFor(q){
    var data = window.productsData || window.PRODUCTS_DATA || null;
    if (!data || !data.length) return null;
    for (var i = 0; i < data.length; i++) {
      var c = data[i];
      if (c.country && q.indexOf(c.country) !== -1) {
        var p = c.min_price ? Number(c.min_price).toLocaleString() + '원~' : '';
        return '🌏 <strong>' + c.country + '</strong> eSIM' + (p ? '\n최저 <strong style="color:#F2751F;">' + p + '</strong>' : '') +
          (c.plan_count ? ' · 요금제 ' + c.plan_count + '종' : '') +
          '\n\n<a href="' + (isMobilePage ? '#' : 'index.html#store') + '" onclick="if(window.switchNav){switchNav(\'store\');var i=document.getElementById(\'storeSearchInput\');if(i){i.value=\'' + c.country + '\';if(window.renderStoreProducts)renderStoreProducts(\'all\',\'' + c.country + '\');}}">👉 ' + c.country + ' 요금제 전체 보기</a>';
      }
    }
    return null;
  }

  // ---------- 입력 라우터 ----------
  function route(q){
    var t = q.replace(/\s+/g, '');
    if (/설치|원클릭|QR|큐알|수동|등록방법/i.test(t)) return aInstall();
    if (/사용량|얼마남|남은데이터|데이터확인|조회/.test(t)) return aUsage();
    if (/리셋|초기화|충전시간|몇시에/.test(t)) {
      for (var k in RESET) if (t.indexOf(k) !== -1) { bot('🇰🇷→ <strong>' + k + '</strong>의 일일 데이터 리셋은 <strong>현지 ' + RESET[k] + '</strong>예요 ↻'); return homeChips(); }
      return aReset();
    }
    if (/유효|기간|만료|환불|취소|교환/.test(t)) return aValid();
    if (/기종|기기|아이폰|갤럭시|폰에서|되나요|지원/.test(t)) {
      var pr0 = priceFor(q); if (pr0 && /얼마|가격|요금/.test(t)) { bot(pr0); return homeChips(); }
      return aDevice();
    }
    if (/상담|사람|문의|도와|연결|전화/.test(t)) return aAgent(q);
    var pr = priceFor(q);
    if (pr) { bot(pr); return homeChips(); }
    for (var k2 in RESET) if (t.indexOf(k2) !== -1) {
      bot('🌏 <strong>' + k2 + '</strong> 여행 준비 중이시군요!\n· 일일 리셋: 현지 ' + RESET[k2] + ' ↻\n· 요금이 궁금하면 "' + k2 + ' 요금"이라고 물어보세요!');
      return homeChips();
    }
    bot('음, 그건 로미가 바로 답하기 어려운 질문이에요 🦊\n상담원이 정확히 도와드릴게요!');
    aAgent(q);
  }

  // ---------- 이벤트 ----------
  // 첫 방문: 3초 후 살짝 흔들어 존재 알림 (하루 1회)
  try {
    if (!sessionStorage.getItem('rb_hi')) {
      sessionStorage.setItem('rb_hi', '1');
      setTimeout(function(){ fab.style.animation = 'rbNudge 0.7s ease 2'; }, 3000);
      var kf = document.createElement('style');
      kf.textContent = '@keyframes rbNudge{0%,100%{transform:none}30%{transform:scale(1.12) rotate(-6deg)}60%{transform:scale(1.08) rotate(5deg)}}';
      document.head.appendChild(kf);
    }
  } catch(e){}
  var opened = false;
  fab.onclick = function(){
    panel.classList.toggle('on');
    if (panel.classList.contains('on') && !opened) {
      opened = true;
      bot('안녕하세요! JDISIM 여행 도우미 <strong>로미</strong>예요 🦊\n무엇을 도와드릴까요?');
      homeChips();
    }
  };
  panel.querySelector('.rb-x').onclick = function(){ panel.classList.remove('on'); };
  var inp = panel.querySelector('#rbInput');
  function send(){ var v = inp.value.trim(); if (!v) return; me(v); inp.value = ''; route(v); }
  panel.querySelector('#rbSend').onclick = send;
  inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') send(); });
})();
