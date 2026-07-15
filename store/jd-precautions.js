/* JDISIM 상품 유의사항 정본 (2026-07-15)
 * 목적: 유의사항 문구를 한 곳에서만 관리 — mobile.html·(향후) index.html이 이 파일을 읽음.
 *       배포 시 HTML이 바뀌어도 이 파일은 버전 그대로면 브라우저 캐시 재사용.
 * 사용: window.JD_PRECAUTIONS(country, carrier) → 문자열(HTML) 배열
 * 수정법: 아래 RULES에서 해당 규칙의 문구만 고치면 모든 페이지에 반영. 버전 쿼리(?v=)도 같이 올릴 것.
 */
(function () {
  'use strict';

  // match: { c: 국가명 포함 문자열들(or), k: 통신사명 포함 문자열들(or) } — 둘 다 있으면 AND
  var RULES = [
    { c: ['일본'], k: ['소프트뱅크'], t: ['<strong>소프트뱅크 사용량 집계 지연:</strong> 사용량 조회는 가능하지만 현지 통신사 집계 특성상 최대 1~2일 지연 반영될 수 있어요.'] },
    { c: ['일본'], k: ['도코모'], t: ['<strong>도코모 APN 수동 설정:</strong> 자동 연결 실패 시 셀룰러 네트워크 설정에서 APN(spmode.ne.jp)을 수동 등록해야 개통됩니다.'] },
    { c: ['베트남'], t: [
      '<strong>베트남 시간 기준 일일 리셋:</strong> 매일 23:00(베트남 시간)에 일일 사용 용량이 자동 리셋됩니다.',
      '<strong>비엣텔망 수동 고정:</strong> 속도가 느린 Vietnamobile로 자동 연결되는 경우 셀룰러 설정에서 \'Viettel\'망을 수동 고정해 주세요.',
      '<strong>ChatGPT 접속 제한 안내:</strong> 본 상품은 홍콩 IP를 경유하므로 ChatGPT 등 일부 해외 서비스 접속이 원활하지 않을 수 있습니다.',
      '<strong>15일 유효기간 준수:</strong> 발급일로부터 15일 이내에 현지 신호 연결로 최초 활성화해야 정상 작동합니다.'
    ] },
    { c: ['대만'], t: ['<strong>실명 인증(KYC) 등록 필수:</strong> 대만 통신법에 따라 eSIM 스캔 직후 수신되는 문자 링크로 여권 실명 등록을 완료해야 데이터 차단이 해제됩니다.'] },
    { c: ['괌', '사이판'], t: ['<strong>현지 도착 후 개통 문자로 시작:</strong> 도착해서 개통 문자가 발송되는 시점부터 사용일이 카운트돼요 — 미리 구매해 두셔도 기간이 줄지 않습니다.'] },
    { c: ['미국', '캐나다', '괌', '사이판'], t: ['<strong>단말기 컨트리락 해제 확인:</strong> 컨트리락이 해제된 기기에서만 사용 가능하므로 출국 전 통신사에 락 해제 여부를 확인하세요.'] },
    { c: ['몰디브'], t: [
      '<strong>eSIM 프로필 삭제 절대 금지:</strong> 몰디브 디라구(Dhiraagu) 이심은 삭제 시 재등록이 기술적으로 차단됩니다.',
      '<strong>통화/문자 한도:</strong> 20GB 요금제(통화 150분/문자 150건), 30GB 요금제(통화 300분/문자 300건) 무료 제공',
      '<strong>번호/사용량 조회:</strong> 다이얼러에서 *2# 입력 후 통화 시 번호 확인, 727 번호로 \'myusage\' 문자 발송 시 잔량 확인이 가능합니다.'
    ] },
    { c: ['몽골'], t: [
      '<strong>통화 및 수신 전용 SMS:</strong> 요금제별 현지 무료 통화(10분~150분) 발신이 제공되며, SMS는 수신만 가능합니다.',
      '<strong>잔여 데이터 조회:</strong> 다이얼러에서 *1411# 입력 후 통화 버튼을 누르면 문자로 실시간 사용량이 회신됩니다.'
    ] },
    { c: ['유럽'], t: ['<strong>국경 통과 이동 시 재부팅:</strong> 유럽 다국가 횡단 중 국경에서 신호가 끊기면 기기를 재부팅하면 로컬 로밍 파트너망으로 자동 갱신됩니다.'] },
    { c: ['한국', '대한민국'], t: ['<strong>QR 스캔 즉시 일수 카운트:</strong> 등록/QR 스캔 즉시 사용 기한이 차감되므로 출국 시나 사용 개시일에 등록해 주세요.'] },
    { c: ['인도'], t: ['<strong>주(State) 이동 시 재부팅:</strong> 주 경계를 넘으며 망이 불안정해지면 기기 재부팅 또는 비행기 모드를 껐다 켜 주세요.'] },
    { c: ['글로벌', '복수국가', '남미', '중동', '아프리카'], t: ['<strong>다국가 환승 시 대처법:</strong> 국가 경유 시 5~10초간 비행기 모드를 켰다 끄거나 재부팅하여 파트너 로밍망을 다시 잡아 주세요.'] },
    { c: ['중국', '홍콩', '마카오'], t: ['<strong>중국 현지 구매 아이폰 사용 불가:</strong> 중국/홍콩/마카오에서 구매한 아이폰은 eSIM 기능이 비활성화되어 사용이 불가합니다.'] },
    { k: ['보다폰', 'vodafone'], t: [
      '<strong>QR 발송 즉시 사용일 시작 (Vodafone):</strong> QR이 이메일로 <strong>발송되는 순간 개통이 시작</strong>되므로 일정 확인 후 구매해 주세요.',
      '<strong>eSIM 프로필 삭제 금지:</strong> 삭제 시 재등록이 불가하니 설치 후 절대 지우지 마세요.'
    ] },
    { k: ['오렌지스페인'], t: ['<strong>개통 예약 신청 필수 (Orange):</strong> 결제란에 <strong>실제 도착 예정일 하루 전날</strong>을 개통일로 기입해 주세요.'] },
    { k: ['오렌지프랑스'], t: [
      '<strong>한국 무료 발신 혜택:</strong> 요금제에 따라 한국 발신 통화(30분~120분)와 국제문자(200건~1000건)가 무료 탑재되어 있습니다.',
      '<strong>번호 및 잔량 조회:</strong> 현지에서 225 다이얼 후 통화 버튼을 누르면 번호와 잔량이 문자로 전송됩니다.',
      '<strong>500GB 장기 요금제 실명인증:</strong> 90일 상품은 30일 이내 수신 링크로 여권 인증을 완료해야 회선이 유지됩니다.'
    ] },
    { k: ['쓰리', 'three'], t: [
      '<strong>QR 스캔 즉시 개통 시작 (Three):</strong> QR 등록 순간 개통되므로 출국 직전 또는 현지 공항에서 설치를 권장합니다.',
      '<strong>eSIM 프로필 삭제 금지:</strong> 임의 삭제 시 복구되지 않습니다.'
    ] }
  ];

  window.JD_PRECAUTIONS = function (country, carrier) {
    var nc = String(country || '').toLowerCase();
    var nk = String(carrier || '').toLowerCase();
    var out = [];
    RULES.forEach(function (r) {
      var okC = !r.c || r.c.some(function (x) { return nc.indexOf(x.toLowerCase()) !== -1; });
      var okK = !r.k || r.k.some(function (x) { return nk.indexOf(x.toLowerCase()) !== -1; });
      if (okC && okK) out.push.apply(out, r.t);
    });
    return out;
  };
})();
