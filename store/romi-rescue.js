/* ============================================================
   ROMI Rescue v1 (romi-rescue.js) — ConnectGuard Rescue Orchestrator의 JDISIM 이식판
   원본: connectguard app/rescue.py — 단계형 복구 결정 트리

   설계 원칙 (도도매 체제 + 웹 현실에 맞춘 변형):
   · 오프라인 우선: 연결 안 되는 고객은 서버를 못 부른다 → 결정 트리는 100% 클라이언트에서 동작
   · 자동 재발급(AUTO_REISSUE)은 도도매 체제에서 불가 → 정책 플래그로 봉인 (직계약 후 개방)
   · 공급사 재동기화 = 사용량/발급 상태 재조회 (usage API) + 실패 시 카톡 에스컬레이션
   · 모든 결과는 온라인 복귀 시 RSQ(품질 그래프)와 carestat에 비콘으로 축적 → 데이터 자산

   사용 (issue.html):
     RomiRescue.start({
       careId: '...', country: '일본', issued: true, installedAt: ts|null,
       onOpenSignalFix: fn, onCheckUsage: fn(cb(ok)),   // 기존 기능 재사용
     });
   ============================================================ */
(function () {
  'use strict';

  var POLICY = {
    initialSlaMin: 3,          // 도착 후 최초 연결 대기 (분)
    autoReissue: false,        // 도도매 체제: 자동 재발급 봉인 (직계약 후 true + 비용정책)
    probeUrl: (window.CARE_API ? window.CARE_API.replace('/api/esim', '/api/rsq')
                               : 'https://jdisim-proxy.vercel.app/api/rsq') + '?ping=1',
  };

  function key(careId, k) { return 'romi_rescue_' + (careId || 'x') + '_' + k; }
  function getN(careId, k) { return parseInt(localStorage.getItem(key(careId, k)) || '0', 10); }
  function bump(careId, k) { localStorage.setItem(key(careId, k), String(getN(careId, k) + 1)); }

  /* ---------- HTTPS 프로브 (셀룰러 실연결 검사) ---------- */
  function probe(cb) {
    if (!navigator.onLine) return cb({ connected: false, httpsMs: null });
    var t0 = performance.now();
    var done = false;
    var to = setTimeout(function () { if (!done) { done = true; cb({ connected: false, httpsMs: null }); } }, 8000);
    fetch(POLICY.probeUrl, { cache: 'no-store' })
      .then(function () { if (!done) { done = true; clearTimeout(to); cb({ connected: true, httpsMs: Math.round(performance.now() - t0) }); } })
      .catch(function () { if (!done) { done = true; clearTimeout(to); cb({ connected: false, httpsMs: null }); } });
  }

  /* ---------- 결정 트리 (rescue.py 충실 이식 + 도도매 변형) ---------- */
  function decide(ctx) {
    if (ctx.connected) {
      return { stage: 'RESOLVED', severity: 'info',
        title: '연결이 확인됐어요! 🎉',
        actions: ['셀룰러 데이터가 정상 동작 중이에요.', '품질 측정을 저장하고 여행을 계속하세요.'],
        reasons: ['CONNECTED_PROBE_CONFIRMED'] };
    }
    if (!ctx.issued) {
      return { stage: 'PROVIDER_RESYNC', severity: 'critical',
        title: '발급 상태부터 확인할게요',
        actions: ['eSIM 발급 상태를 다시 조회합니다.', '중복 주문 없이 기존 주문으로 재동기화해요.'],
        reasons: ['PROFILE_NOT_ISSUED'] };
    }
    if (ctx.minutesSinceExpected < POLICY.initialSlaMin) {
      return { stage: 'MONITORING', severity: 'info',
        title: '최초 연결을 기다리는 중',
        actions: ['현지망 등록에 보통 1~3분이 걸려요.', '3분 후 자동으로 다시 검사할게요.'],
        reasons: ['WITHIN_INITIAL_SLA'] };
    }
    if (ctx.guidedFixAttempts === 0) {
      return { stage: 'DIAGNOSE', severity: 'warning',
        title: '설정을 3단계로 잡아볼게요',
        actions: ['여행 eSIM 켜짐 · 기본 데이터 회선 · 데이터 로밍 ON을 순서대로 확인해요.',
                  '전체 초기화 없이, 상품별 파트너망 기준으로 안내합니다.'],
        reasons: ['NO_FIRST_CONNECTION', 'GUIDED_FIX_NOT_ATTEMPTED'] };
    }
    if (ctx.resyncAttempts === 0) {
      return { stage: 'PROVIDER_RESYNC', severity: 'warning',
        title: '회선 상태를 다시 조회할게요',
        actions: ['발급·개통·사용량 상태를 재조회합니다.', '프로필과 요금제 상태의 불일치를 검사해요.'],
        reasons: ['GUIDED_FIX_FAILED', 'PROVIDER_RESYNC_REQUIRED'] };
    }
    // 도도매 체제: 자동 재발급 봉인 → 대체 추천/상담 에스컬레이션
    if (POLICY.autoReissue && ctx.backupBetter && ctx.withinBudget) {
      return { stage: 'AUTO_REISSUE_PENDING', severity: 'critical',
        title: '대체 eSIM을 자동 발급합니다',
        actions: ['기존 프로필 환불 가능 여부를 잠그고, 멱등키로 1회만 발급해요.'],
        reasons: ['PRIMARY_RECOVERY_FAILED', 'RESCUE_WITHIN_COST_POLICY'] };
    }
    return { stage: 'HUMAN_ESCALATION', severity: 'critical',
      title: '로미 케어 데스크로 연결할게요',
      actions: ['지금까지의 진단 기록을 상담에 자동으로 첨부해요.',
                '대체 상품·환불을 사람이 바로 판단해 드립니다.'],
      reasons: ['NO_SAFE_BACKUP_ROUTE'] };
  }

  /* ---------- 결과 보고 (온라인 복귀 시 품질 그래프 축적) ---------- */
  function report(ctx, decision, probeMs) {
    try {
      if (window.RomiRSQ && RomiRSQ.report) {
        RomiRSQ.report(decision.stage === 'RESOLVED' ? 'ok' : 'fail', {
          country: ctx.country, reason: decision.reasons.join(','), httpsMs: probeMs
        });
      }
    } catch (e) {}
  }

  /* ---------- UI: 결정 단계를 케어링크 스타일 카드로 ---------- */
  function render(ctx, decision, hooks) {
    var host = document.getElementById('rescueCard');
    if (!host) {
      host = document.createElement('div'); host.id = 'rescueCard';
      var band = document.getElementById('arvBand');
      var app = document.getElementById('app');
      (band && band.parentNode ? band.parentNode : app).insertBefore(host, band ? band.nextSibling : (app && app.firstChild));
    }
    var tone = decision.severity === 'critical' ? ['#FEF2F2', '#FCA5A5', '#B91C1C']
             : decision.severity === 'warning' ? ['#FFF7ED', '#FDBA74', '#C2410C']
             : ['#F0FDF4', '#86EFAC', '#15803D'];
    var btn = '';
    if (decision.stage === 'DIAGNOSE') btn = '<button type="button" data-a="sfx">📶 3단계 신호 잡기 시작</button>';
    if (decision.stage === 'PROVIDER_RESYNC') btn = '<button type="button" data-a="resync">🔄 상태 재조회</button>';
    if (decision.stage === 'MONITORING') btn = '<button type="button" data-a="recheck">지금 다시 검사</button>';
    if (decision.stage === 'HUMAN_ESCALATION') btn = '<a href="https://pf.kakao.com/_GSixcn/chat" target="_blank" rel="noopener" data-a="kakao">💬 진단기록과 함께 상담 연결</a>';
    host.innerHTML =
      '<div style="margin:0 0 12px;padding:14px 15px;border-radius:14px;background:' + tone[0] + ';border:1px solid ' + tone[1] + ';">' +
      '<div style="font-weight:900;font-size:0.92rem;color:' + tone[2] + ';">🛟 연결 보장 모드 — ' + decision.title + '</div>' +
      '<ul style="margin:8px 0 0;padding-left:18px;font-size:0.8rem;line-height:1.6;color:#4a3a30;">' +
      decision.actions.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>' +
      (btn ? '<div style="margin-top:10px;">' + btn.replace('<button ', '<button style="border:none;border-radius:11px;padding:11px 14px;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-family:inherit;font-weight:800;font-size:0.82rem;cursor:pointer;" ')
                                                   .replace('<a ', '<a style="display:inline-block;border-radius:11px;padding:11px 14px;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-weight:800;font-size:0.82rem;text-decoration:none;" ') + '</div>' : '') +
      '</div>';
    var el = host.querySelector('[data-a]');
    if (!el) return;
    el.addEventListener('click', function () {
      var a = el.getAttribute('data-a');
      if (a === 'sfx') { bump(ctx.careId, 'fix'); if (hooks.onOpenSignalFix) hooks.onOpenSignalFix(); }
      if (a === 'resync') { bump(ctx.careId, 'resync'); if (hooks.onCheckUsage) hooks.onCheckUsage(function () { run(ctx, hooks); }); else run(ctx, hooks); }
      if (a === 'recheck') { run(ctx, hooks); }
    });
  }

  /* ---------- 실행 루프 ---------- */
  function run(base, hooks) {
    probe(function (p) {
      var arrivedAt = parseInt(localStorage.getItem(key(base.careId, 'arv')) || '0', 10);
      if (!arrivedAt) { arrivedAt = Date.now(); localStorage.setItem(key(base.careId, 'arv'), String(arrivedAt)); }
      var ctx = {
        careId: base.careId, country: base.country,
        connected: p.connected, issued: !!base.issued,
        minutesSinceExpected: (Date.now() - arrivedAt) / 60000,
        guidedFixAttempts: getN(base.careId, 'fix'),
        resyncAttempts: getN(base.careId, 'resync'),
        backupBetter: false, withinBudget: false,
      };
      var d = decide(ctx);
      render(ctx, d, hooks);
      report(ctx, d, p.httpsMs);
      if (d.stage === 'MONITORING') setTimeout(function () { run(base, hooks); }, POLICY.initialSlaMin * 60000);
    });
  }

  window.RomiRescue = { start: run, decide: decide, POLICY: POLICY };
})();
