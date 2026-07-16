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
  function rbBuzz(ms){ try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
  var isMobilePage = /mobile\.html|issue\.html/.test(location.pathname) || document.querySelector('.bottom-nav') || document.querySelector('.bbar');
  var BOTTOM = isMobilePage ? 'calc(88px + env(safe-area-inset-bottom, 0px))' : '30px';

  var RESET = { '일본':'새벽 1시','한국':'새벽 1시','베트남':'밤 11시','태국':'밤 11시','라오스':'밤 11시','캄보디아':'밤 11시','중국':'자정','대만':'자정','필리핀':'자정','싱가포르':'자정','말레이시아':'자정','홍콩':'자정','마카오':'자정','몰디브':'밤 9시','괌':'새벽 2시','사이판':'새벽 2시','호주':'새벽 2시','뉴질랜드':'새벽 4시','미국':'서부 08:00 · 동부 11:00' };

  // ---------- 스타일 ----------
  var css = document.createElement('style');
  css.textContent =
    '#rbFab{position:fixed;right:16px;bottom:' + BOTTOM + ';z-index:99900;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#F97316,#F59E0B);box-shadow:0 10px 26px rgba(249,115,22,0.45);display:flex;align-items:center;justify-content:center;transition:transform .2s;}' +
    '#rbFab:active{transform:scale(.92)}#rbFab img{width:38px;height:38px;object-fit:contain;pointer-events:none;}' +
    '#rbPanel{position:fixed;right:12px;bottom:calc(' + BOTTOM + ' + 68px);z-index:99901;width:min(360px,calc(100vw - 24px));max-height:min(560px,70vh);background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,0.3);display:none;flex-direction:column;overflow:hidden;font-family:Pretendard,"Apple SD Gothic Neo",sans-serif;}' +
    '#rbPanel.on{display:flex;animation:rbUp .28s cubic-bezier(.2,.9,.3,1) both;}@keyframes rbUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
    /* 모바일: 챗 열면 풀스크린 */
    '@media(max-width:640px){#rbPanel{left:0;right:0;bottom:0;top:0;width:100vw;height:100dvh;max-height:none;border-radius:0;}}' +
    /* FAB 라벨: 아이콘 아래 짧은 명찰 (말풍선 제거) */
    '#rbFab .rb-label{position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;font-size:.58rem;font-weight:800;letter-spacing:.4px;padding:3px 9px;border-radius:9px;white-space:nowrap;box-shadow:0 4px 10px rgba(15,23,42,.25);font-family:Pretendard,sans-serif;pointer-events:none;}' +
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
    '.rb-ft button{flex-shrink:0;width:44px;height:44px;border:none;border-radius:13px;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-weight:900;cursor:pointer;font-size:1rem;}' +
    '.rb-typing{display:inline-flex;gap:4px;padding:2px 0;}.rb-typing i{width:7px;height:7px;border-radius:50%;background:#F1690D;opacity:.35;animation:rbDot 1.1s infinite;}' +
    '.rb-typing i:nth-child(2){animation-delay:.18s}.rb-typing i:nth-child(3){animation-delay:.36s}@keyframes rbDot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}';
  document.head.appendChild(css);

  // ---------- 마크업 ----------
  var fab = document.createElement('button');
  fab.id = 'rbFab'; fab.setAttribute('aria-label', '로미에게 물어보기');
  fab.innerHTML = '<img src="images/fox-hello.webp" alt="" onerror="this.outerHTML=\'🦊\'"><span class="rb-label">챗봇</span>';
  var panel = document.createElement('div');
  panel.id = 'rbPanel';
  panel.innerHTML =
    '<div class="rb-hd"><img src="images/fox-hello.webp" alt="" onerror="this.remove()"><div><b>로미</b><span>JDISIM 여행 도우미 · 바로 답해드려요</span></div><button class="rb-x" aria-label="닫기">✕</button></div>' +
    '<div class="rb-body" id="rbBody"></div>' +
    '<div class="rb-ft"><input id="rbInput" placeholder="궁금한 걸 물어보세요 (예: 일본 요금)"><button id="rbSend">↑</button></div>';
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body = panel.querySelector('#rbBody');
  var CTX = { country: '' };   // 대화 컨텍스트: 마지막 언급 국가
  var HIST = [];               // AI 멀티턴용 대화 기록 (최근 8개)
  var USERINFO = { nm: '', ph: '' }; // 사용량 조회로 파악된 고객
  function track(role, content){ HIST.push({ role: role, content: String(content).slice(0, 300) }); if (HIST.length > 8) HIST.shift(); }
  function persist(){ try { sessionStorage.setItem('rb_log', body.innerHTML.slice(0, 60000)); sessionStorage.setItem('rb_ctx', JSON.stringify(CTX)); } catch(e){} }
  function restore(){
    try {
      var h = sessionStorage.getItem('rb_log');
      if (h) { body.innerHTML = h; CTX = JSON.parse(sessionStorage.getItem('rb_ctx') || '{}') || {}; rebindChips(); return true; }
    } catch(e){}
    return false;
  }
  function rebindChips(){
    // 복원된 칩은 핸들러가 없으니 라벨로 재연결
    body.querySelectorAll('.rb-chip').forEach(function(b){
      b.onclick = function(){ me(b.textContent); routeChip(b.textContent); };
    });
    body.querySelectorAll('.rb-form').forEach(function(f){ f.remove(); }); // 미완성 폼은 제거
  }
  function routeChip(label){
    if (label.indexOf('안 터져') !== -1 || label.indexOf('🚨') !== -1) return aTrouble();
    if (label.indexOf('설치') !== -1) return aInstall();
    if (label.indexOf('사용량') !== -1) return aUsage();
    if (label.indexOf('리셋') !== -1) return aReset();
    if (label.indexOf('유효') !== -1 || label.indexOf('환불') !== -1) return aValid();
    if (label.indexOf('기종') !== -1) return aDevice();
    if (label.indexOf('콜백') !== -1) return aInbox('');
    if (label.indexOf('카톡') !== -1) { bot('<a href="' + KAKAO + '" target="_blank" rel="noopener">💬 카톡 상담 열기 →</a>'); return homeChips(); }
    if (label.indexOf('상담') !== -1) return aAgent();
    return homeChips();
  }
  function typing(){ var d = document.createElement('div'); d.className = 'rb-msg bot'; d.innerHTML = '<span class="rb-typing"><i></i><i></i><i></i></span>'; body.appendChild(d); scrollDn(); return d; }
  function isNight(){ var h = new Date().getHours(); return h >= 21 || h < 8; }
  function scrollDn(){ body.scrollTop = body.scrollHeight; }
  function bot(html){ var d = document.createElement('div'); d.className = 'rb-msg bot'; d.innerHTML = html; body.appendChild(d); scrollDn(); persist(); return d; }
  function me(t){ var d = document.createElement('div'); d.className = 'rb-msg me'; d.textContent = t; body.appendChild(d); scrollDn(); persist(); track('me', t); }
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
      ['🚨 데이터가 안 터져요', aTrouble],
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
  // QR/티켓 미수신 → 봇이 직접 찾아서 재전달 (셀프 재발급)
  function aNotReceived(){
    bot('걱정 마세요, 제가 <strong>직접 찾아드릴게요</strong> 🦊\n결제 후 QR은 카톡(알림톡)과 문자로 자동 발송되는데, 가끔 <strong>스팸함이나 차단 목록</strong>에 들어가는 경우가 있어요.\n\n구매하신 이름과 전화번호를 알려주시면 티켓을 바로 다시 꺼내드릴게요!');
    var f = document.createElement('div'); f.className = 'rb-form';
    f.innerHTML = '<input id="rbFn" placeholder="이름" style="max-width:88px;"><input id="rbFp" type="tel" placeholder="01012345678"><button>찾기</button>';
    body.appendChild(f); scrollDn();
    f.querySelector('button').onclick = function(){
      var nm = f.querySelector('#rbFn').value.trim();
      var ph = f.querySelector('#rbFp').value.replace(/[^0-9]/g, '');
      if (ph.length < 10) { bot('전화번호를 확인해 주세요! (예: 01012345678)'); return; }
      me((nm ? nm + ' · ' : '') + ph.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-****-$3'));
      var w = typing();
      fetch(CARE + '?action=history&phone=' + encodeURIComponent(ph))
        .then(function(r){ if (!r.ok) throw 0; return r.json(); })
        .then(function(d){
          var list = d && (d.esims || []);
          var pick = null;
          for (var i = 0; i < list.length; i++) { if (list[i] && (list[i].iccid || list[i].ICCID)) { pick = list[i]; break; } }
          if (!pick) throw 1;
          USERINFO = { nm: nm, ph: ph };
          var iccid = String(pick.iccid || pick.ICCID);
          var prod = pick.prodName || pick.option || '';
          var care = 'https://jdisim.co.kr/issue.html?care=' + encodeURIComponent(iccid) + (pick.option ? '&plan=' + encodeURIComponent(pick.option) : '') + (nm ? '&n=' + encodeURIComponent(nm) : '');
          w.innerHTML = '✅ 찾았어요! ' + (nm ? nm + ' 님의 ' : '') + (prod ? '<strong>' + esc0(prod) + '</strong>' : 'eSIM') + '\n\n<a href="' + care + '" target="_blank" rel="noopener">🎫 내 티켓 열기 (QR·설치·사용량) →</a>\n\n이 링크를 <strong>즐겨찾기</strong>해두시면 여행 내내 편해요!';
          homeChips();
        })
        .catch(function(){
          w.innerHTML = '해당 번호로 주문을 못 찾았어요 😢 결제 시 입력한 번호가 다를 수 있어요.\n담당자가 직접 찾아드릴게요!';
          offerHuman('QR/티켓 미수신 — 주문 조회 요청');
        });
    };
  }
  // eSIM 삭제 사고 — 긴급
  function aDeleted(){
    bot('⚠️ 잠깐! 지금부터가 중요해요.\neSIM은 삭제하면 <strong>같은 QR로 재설치가 안 되는 경우가 많아요</strong>. 혹시 아직 안 지우셨다면 <strong>절대 삭제하지 마시고</strong>, 이미 지우셨다면 추가 조작 없이 그대로 두세요.\n\n상황(개통 전/후, 사용 중이었는지)에 따라 조치가 달라서 <strong>담당자가 직접</strong> 확인해 드릴게요 — 최대한 빨리 도와드릴게요!');
    offerHuman('eSIM 삭제 관련 긴급 문의');
  }
  // 속도 저하
  function aSlow(){
    bot('속도가 느려지는 원인은 보통 3가지예요 🦊\n\n① <strong>오늘의 고속 데이터 소진</strong> — 일 용량 상품은 소진 후 저속 무제한으로 전환돼요. 현지 리셋 시간에 다시 빨라져요! (사용량 조회로 확인 가능)\n② <strong>현지 통신망 혼잡</strong> — 통신사 수동 선택으로 다른 망을 잡아보세요\n③ <strong>5G 불안정</strong> — 설정에서 <strong>4G/LTE로 고정</strong>하면 오히려 안정적이에요\n\n📊 지금 고속 데이터가 남았는지 확인해 볼까요?');
    chips([['📊 내 사용량 확인하기', aUsage]]);
    homeChips();
  }
  // 연장/소진 → 재구매 퍼널
  function aExtend(){
    var cty = CTX.country || '';
    bot('여행 중 연장은 아주 간단해요 🦊\n지금 쓰시는 eSIM은 그대로 두고, <strong>같은 국가 상품을 하나 더 구매</strong>해서 설치하면 이어서 쓸 수 있어요. (와이파이에서 설치 → 기존 게 끝나면 새 걸로 전환)\n\n' + (cty ? '<strong>' + cty + '</strong> 상품 바로 보여드릴게요!' : '어느 나라에서 쓰실 건가요? 스토어에서 바로 고를 수 있어요!'));
    chips([[ cty ? '➕ ' + cty + ' 연장 상품 보기' : '🛒 스토어에서 고르기', function(){
      me('연장 상품 보기');
      if (window.switchNav) { switchNav('store'); var i2 = document.getElementById('storeSearchInput'); if (i2 && cty) { i2.value = cty; if (window.renderStoreProducts) renderStoreProducts('all', cty); } panel.classList.remove('on'); }
      else location.href = 'https://jdisim.co.kr/mobile.html';
    }]]);
    homeChips();
  }
  function aCalls(){
    bot('여행 eSIM은 <strong>데이터 전용</strong>이라 전화번호가 없고, 일반 전화·문자는 안 돼요.\n대신 데이터로 <strong>카톡·보이스톡·페이스타임</strong>은 전부 잘 돼요! 🦊\n\n💡 꿀팁: 한국 번호로 오는 <strong>인증문자를 받아야 한다면</strong> — 한국 유심 회선을 켜둔 채 <strong>데이터 로밍만 꺼두세요</strong>. 문자 수신은 무료라 요금 안 나와요. (전화를 받으면 로밍 통화료가 나오니 주의!)');
    homeChips();
  }
  function aHotspot(){
    bot('네! 대부분의 상품에서 <strong>핫스팟(테더링) 사용 가능</strong>해요 — 노트북이나 동행자 폰에 나눠 쓸 수 있어요 🦊\n\n혹시 켰는데 연결이 안 되면 기기 설정 문제일 수 있으니 상담으로 도와드릴게요. 참고로 일 용량 상품은 나눠 쓰면 <strong>고속 데이터가 빨리 소진</strong>되니 그 점만 기억해 주세요!');
    homeChips();
  }
  function aVerify(){
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    bot('설치가 잘 됐는지 확인하는 방법 3가지예요 🦊\n\n' +
      '① <strong>발급 카톡의 [내 티켓 열기]</strong> → 설치 존의 <strong>[설치 자동 확인]</strong> 버튼 — 가장 정확해요!\n' +
      '② 폰에서 직접: ' + (isIOS
        ? '<strong>설정 > 셀룰러</strong>에 새 회선(eSIM)이 목록에 보이면 설치된 거예요'
        : '<strong>설정 > 연결 > SIM 관리자</strong>에 eSIM이 보이면 설치된 거예요') + '\n' +
      '③ 회선 이름 옆에 <strong>"번호 없음"</strong>이라고 떠도 정상이에요 — 데이터 전용이라 번호가 원래 없어요!\n\n' +
      '💡 한국에서는 설치돼 있어도 <strong>"활성화 중"이나 "등록 실패"처럼 보일 수 있는데 정상</strong>이에요. 현지 도착하면 자동으로 연결돼요 ✈️');
    homeChips();
  }
  function aTrouble(){
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    bot('당황하지 마세요, 90%는 설정 3개로 해결돼요! ' + (isIOS ? '아이폰' : '갤럭시') + ' 기준으로 알려드릴게요 🦊\n\n' +
      (isIOS
        ? '① <strong>설정 > 셀룰러</strong> → eSIM 회선 <strong>켜기</strong>\n② 같은 화면 <strong>셀룰러 데이터</strong> → eSIM 선택\n③ eSIM 선택 → <strong>데이터 로밍 ON</strong> (한국 유심 회선은 로밍 OFF!)\n④ <strong>셀룰러 데이터 전환 허용 OFF</strong> ← 이게 켜져 있으면 자꾸 끊겨요\n⑤ 비행기모드 20초 켰다 끄기 → 안 되면 재부팅'
        : '① <strong>설정 > 연결 > SIM 관리자</strong> → eSIM <strong>켜기</strong>\n② 같은 화면 <strong>모바일 데이터</strong> → eSIM 선택\n③ <strong>모바일 네트워크 > 데이터 로밍 ON</strong> (한국 유심은 OFF!)\n④ <strong>설정 > 연결 > 데이터 사용 > 모바일 데이터</strong> 켜짐 확인\n⑤ 비행기모드 20초 켰다 끄기 → 안 되면 재부팅') +
      '\n\n⚠️ 어떤 경우에도 <strong>eSIM을 삭제하진 마세요</strong> — 삭제하면 재설치가 안 돼요!');
    bot('그래도 안 되면 <strong>통신사 수동 선택</strong>을 해볼게요:\n' +
      (isIOS ? '설정 > 셀룰러 > 네트워크 선택 > 자동 끄기 → 안내받은 통신사 선택' : '설정 > 연결 > 해외 로밍 > 로밍 이동통신사 > 수동 선택') +
      '\n5G가 불안정하면 <strong>4G/LTE로 고정</strong>하는 것도 효과적이에요.\n\n여기까지 했는데도 안 되면 바로 도와드릴게요 👇');
    chips([['🩺 상담원에게 바로 연결', function(){ aAgent('현지에서 데이터가 안 터져요 (5단계 체크 완료)'); }]]);
    homeChips();
  }
  function aAgent(pre){
    var q = pre || '상담 요청';
    if (isNight() && !pre) {
      bot('지금은 상담원 응답이 느릴 수 있는 시간이에요 🌙\n<strong>연락처를 남겨주시면 아침에 가장 먼저</strong> 연락드릴게요!');
      return offerHuman('');
    }
    var w = typing();
    fetch(CARE.replace('/api/esim', '/api/ai'), { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ q: q, history: HIST.slice(0, -1), name: USERINFO.nm, phone: USERINFO.ph, country: CTX.country || '', from: isMobilePage ? 'mobile' : 'pc' }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d.reply && !d.escalate) { w.innerHTML = esc0(d.reply); track('bot', d.reply); feedback(q, d.reply); homeChips(); return; }
        if (d.reply && d.escalate) { w.innerHTML = esc0(d.reply); }
        else { w.innerHTML = '이 질문은 담당자가 직접 도와드리는 게 정확해요. 연결해 드릴게요!'; }
        offerHuman(q);
      })
      .catch(function(){ w.innerHTML = '지금 바로 담당자에게 연결해 드릴게요!'; offerHuman(q); });
  }
  function esc0(t){ var d=document.createElement('div'); d.textContent=t; return d.innerHTML.replace(/\n/g,'<br>'); }
  function feedback(q, a){
    var w = document.createElement('div'); w.className = 'rb-chips';
    w.innerHTML = '<button type="button" class="rb-chip">👍 도움됐어요</button><button type="button" class="rb-chip">👎 아쉬워요</button>';
    var bs = w.querySelectorAll('button');
    function send(good){
      fetch(CARE.replace('/api/esim', '/api/learn'), { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fb: { q: q, a: a, good: good } }) }).catch(function(){});
      w.innerHTML = '<span style="font-size:.72rem;font-weight:700;color:#94a3b8;padding:4px 2px;">' + (good ? '감사해요! 🦊' : '알려주셔서 감사해요 — 더 배워올게요 🦊') + '</span>';
      if (!good) offerHuman(q);
    }
    bs[0].onclick = function(){ send(true); };
    bs[1].onclick = function(){ send(false); };
    body.appendChild(w); scrollDn();
  }
  function offerHuman(pre){
    chips([
      ['🗨️ 여기서 바로 실시간 상담', function(){ startLive(pre || ''); }],
      ['📮 연락처 남기고 콜백 받기', function(){ aInbox(pre || ''); }],
      ['💬 카톡으로 상담', function(){ me('카톡 상담'); bot('<a href="' + KAKAO + '" target="_blank" rel="noopener">💬 카톡 상담 열기 →</a>\n연중무휴 · 평균 응답 5분 이내'); homeChips(); }]
    ]);
  }

  // ══ 라이브 상담: 이 창에서 사장님과 직접 대화 ══
  var LIVE = { id: sessionStorage.getItem('rb_live') || '', timer: null, seen: 0 };
  function startLive(pre){
    if (LIVE.id) { bot('이미 상담이 연결돼 있어요! 아래에 이어서 입력해 주세요 🦊'); return; }
    var w = typing();
    fetch(CARE.replace('/api/esim', '/api/chat'), { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'open', q: pre || '상담 요청', name: USERINFO.nm, phone: USERINFO.ph }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d.id) throw 0;
        LIVE.id = d.id; LIVE.seen = 1;
        try { sessionStorage.setItem('rb_live', d.id); } catch(e){}
        w.innerHTML = '🗨️ <strong>상담원을 호출했어요!</strong> 보통 몇 분 안에 여기로 답변이 와요.\n기다리는 동안 아래에 상황을 더 적어주셔도 좋아요.\n\n<span style="font-size:.7rem;color:#94a3b8;">· 이 대화는 개인정보 보호를 위해 <strong>24시간 후 자동 삭제</strong>돼요\n· 창을 닫아도 다시 열면 이어져요</span>';
        pollLive();
      })
      .catch(function(){ w.innerHTML = '연결이 잠시 어렵네요 — 카톡으로 도와드릴게요!\n<a href="' + KAKAO + '" target="_blank" rel="noopener">💬 카톡 상담 열기 →</a>'; homeChips(); });
  }
  function pollLive(){
    if (!LIVE.id) return;
    clearTimeout(LIVE.timer);
    fetch(CARE.replace('/api/esim', '/api/chat') + '?id=' + LIVE.id)
      .then(function(r){ return r.json(); })
      .then(function(c){
        if (c.gone) { endLiveUI('상담이 만료되어 자동 삭제됐어요. 새로 연결할 수 있어요!'); return; }
        var news = (c.msgs || []).slice(LIVE.seen);
        LIVE.seen += news.length;   // 표시 중 오류가 나도 같은 메시지가 반복되지 않도록 선반영
        news.forEach(function(m){
          if (m.f === 'a') { try { bot('👨‍💼 <strong>상담원</strong>\n' + esc0(m.t)); rbBuzz(15); } catch (e) {} }
        });
        if (c.closed) { endLiveUI('상담이 종료됐어요. 도움이 되었길 바라요 🦊'); return; }
        LIVE.timer = setTimeout(pollLive, 4000);
      })
      .catch(function(){ LIVE.timer = setTimeout(pollLive, 8000); });
  }
  function endLiveUI(msg){
    clearTimeout(LIVE.timer); LIVE.id = ''; LIVE.seen = 0;
    try { sessionStorage.removeItem('rb_live'); } catch(e){}
    bot(msg); homeChips();
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
          USERINFO = { nm: nm, ph: ph };
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
    var n = t.length;
    // 국가 언급 시 컨텍스트 저장
    var cty = '';
    for (var ck in RESET) if (t.indexOf(ck) !== -1) { cty = ck; CTX.country = ck; persist(); break; }

    // ── 스몰토크 (짧은 문장일 때만 — 긴 문의에 인사말이 섞여도 오작동 방지) ──
    if (n <= 8 && /^(안녕|하이|헬로|헬로우|ㅎㅇ|hi|hello|반가워)/i.test(t)) {
      bot('안녕하세요! JDISIM 여행 도우미 <strong>로미</strong>예요 🦊\n여행 준비 중이신가요? 무엇이든 물어보세요!');
      return homeChips();
    }
    if (n <= 10 && /(고마워|고맙|감사|땡큐|thank|최고|짱)/i.test(t)) {
      bot('도움이 됐다니 기뻐요! 🦊 즐거운 여행 되세요 ✈️');
      return homeChips();
    }
    if (/누구야|누구세요|이름이뭐|정체가/.test(t)) {
      bot('저는 JDISIM의 여행 도우미 여우 <strong>로미</strong>예요 🦊\n설치·사용량·리셋 시간 같은 건 즉시, 어려운 건 상담원과 함께 도와드려요!');
      return homeChips();
    }
    if (n <= 6 && /^(잘가|바이|빠이|안녕히)/.test(t)) { bot('네, 좋은 여행 되세요! ✈️🦊'); return homeChips(); }

    // ── 확신 규칙 (정밀 키워드) ──
    // 미수신 (QR·티켓·카톡이 안 옴) — '설치'보다 먼저 검사해야 오작동 없음
    if (/재발송|다시보내|재전송/.test(t) || (/(안와|안왔|못받|수신안|안오네|안온다|언제와|언제오)/.test(t) && /(qr|큐알|코드|티켓|카톡|문자|메일|링크|이심|esim)/i.test(t))) return aNotReceived();
    if (/삭제했|삭제해버|지웠|지워버|날려버|없애버/.test(t)) return aDeleted();
    if (/안터|안터져|안돼|안됨|신호없|서비스없|인터넷안|연결안|먹통|데이터가안/.test(t)) return aTrouble();
    if (/설치[^가-힣]*(됐|되었|확인|여부|체크)|됐는지|깔렸|설치확인|잘설치/.test(t)) return aVerify();
    if (/설치|원클릭|큐알|등록방법|QR/i.test(t)) return aInstall();
    if (/사용량|얼마남|남은데이터|데이터확인/.test(t)) return aUsage();
    if (/전화|통화|문자|SMS|인증번호|번호없음/i.test(t)) return aCalls();
    if (/핫스팟|테더링|나눠|공유해/.test(t)) return aHotspot();
    if (/느려|느림|속도가|버벅|답답/.test(t)) return aSlow();
    if (/연장|추가구매|더쓰고|더사|다썼|다쓴|소진됐|기간늘/.test(t)) return aExtend();
    if (/리셋|충전시간|데이터초기화|몇시에(차|충|리)/.test(t)) {
      if (cty) { bot('🌏 <strong>' + cty + '</strong>의 일일 데이터 리셋은 <strong>현지 ' + RESET[cty] + '</strong>예요 ↻'); return homeChips(); }
      return aReset();
    }
    if (/유효기간|기간이|만료|환불|취소|교환/.test(t)) return aValid();
    if (/기종|기기변경|내폰|폰에서되|아이폰\d|갤럭시(s|S|노트|폴드|플립)|EID|지원기종|기기확인/.test(t)) return aDevice();

    // ── 국가 + 구매의도 → 상품 카드 (국가명만으로는 추천하지 않음!) ──
    if (cty && /(이심|esim|요금|얼마|가격|추천|데이터|상품|살래|살까|구매|쓸만|어때)/i.test(t)) {
      var pr = priceFor(cty);
      if (pr) { bot(pr); return homeChips(); }
      bot('🌏 <strong>' + cty + '</strong> 상품은 스토어에서 확인할 수 있어요!\n· 일일 리셋: 현지 ' + RESET[cty] + ' ↻');
      return homeChips();
    }
    // 후속 질문 (국가 생략형: "요금은?", "거기 리셋 몇시?")
    if (!cty && CTX.country) {
      if (/^(요금|얼마|가격)/.test(t) || /(요금|얼마|가격)(은|는|이|가)?[??]?$/.test(t)) {
        var pr2 = priceFor(CTX.country); if (pr2) { bot(pr2); return homeChips(); }
      }
      if (/리셋|몇시/.test(t)) { bot('🌏 <strong>' + CTX.country + '</strong>의 일일 리셋은 <strong>현지 ' + RESET[CTX.country] + '</strong>예요 ↻'); return homeChips(); }
    }
    if (/상담원|상담사|사람연결|사람이랑|직원/.test(t)) return aAgent(q);

    // ── 그 외 전부: AI가 맥락으로 판단 (국가 컨텍스트 동봉) ──
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
      if (LIVE.id) pollLive();
      if (!restore()) {
        bot('안녕하세요! JDISIM 여행 도우미 <strong>로미</strong>예요 🦊\n무엇을 도와드릴까요?');
        homeChips();
      } else { scrollDn(); }
    }
  };
  panel.querySelector('.rb-x').onclick = function(){ panel.classList.remove('on'); };
  var inp = panel.querySelector('#rbInput');
  function send(){
    var v = inp.value.trim(); if (!v) return; me(v); inp.value = '';
    if (LIVE.id) {
      fetch(CARE.replace('/api/esim', '/api/chat'), { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'msg', id: LIVE.id, text: v }) }).catch(function(){});
      return;
    }
    route(v);
  }
  panel.querySelector('#rbSend').onclick = send;
  inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') send(); });

  // ===== 키보드 회피: 키보드가 뜨면 패널을 그 위로 끌어올림 (iOS/안드로이드 공통) =====
  if (window.visualViewport) {
    var vv = window.visualViewport;
    function kbAdjust(){
      if (!panel.classList.contains('on')) { panel.style.transform = ''; panel.style.maxHeight = ''; panel.style.height = ''; return; }
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      var full = window.matchMedia('(max-width:640px)').matches;   // 풀스크린 모드
      if (kb > 40) {                                   // 키보드 열림
        panel.style.animation = 'none';                // rbUp fill-mode가 transform을 덮는 것 방지
        if (full) {
          panel.style.height = vv.height + 'px';       // 패널 하단 = 키보드 상단
          panel.style.transform = 'translateY(' + vv.offsetTop + 'px)';
        } else {
          panel.style.transform = 'translateY(-' + kb + 'px)';
          panel.style.maxHeight = Math.max(240, vv.height - 84) + 'px';  // 패널 상단이 화면 밖으로 안 나가게
        }
        setTimeout(scrollDn, 60);                      // 대화 끝으로
      } else {                                         // 키보드 닫힘
        panel.style.animation = '';
        panel.style.transform = '';
        panel.style.maxHeight = '';
        panel.style.height = '';
      }
    }
    vv.addEventListener('resize', kbAdjust);
    vv.addEventListener('scroll', kbAdjust);
    inp.addEventListener('focus', function(){ setTimeout(kbAdjust, 250); });
    inp.addEventListener('blur', function(){ setTimeout(kbAdjust, 150); });
  }
})();
