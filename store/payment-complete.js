// /api/payment-complete.js — Vercel 서버리스 함수
// 역할: ① 포트원 서버 검증(위변조 차단) ② 사장님 이메일로 주문 알림
//
// [설정 방법] Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 에 추가:
//   IMP_KEY          : 포트원 REST API Key      (포트원 콘솔 → 결제연동 → API Keys)
//   IMP_SECRET       : 포트원 REST API Secret
//   RESEND_API_KEY   : Resend 이메일 API 키     (resend.com 무료 가입 → API Keys)
//   OWNER_EMAIL      : 주문 알림 받을 이메일     (예: jdisim@naver.com)
// 환경변수가 없으면 해당 단계는 건너뛰고 로그만 남깁니다 (사이트는 정상 동작).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const { imp_uid, merchant_uid, order_details } = req.body || {};
  if (!merchant_uid) {
    return res.status(400).json({ error: 'merchant_uid가 필요합니다.' });
  }

  const isTestOrder = !imp_uid || imp_uid.startsWith('imp_mock_');
  let verified = false;
  let verifyNote = '';

  // ===== ① 포트원 서버 결제 검증 =====
  try {
    if (isTestOrder) {
      verifyNote = '테스트/모의 주문 (실결제 아님)';
    } else if (!process.env.IMP_KEY || !process.env.IMP_SECRET) {
      verifyNote = '포트원 API 키 미설정 - 검증 생략됨 (환경변수 IMP_KEY/IMP_SECRET 등록 필요)';
    } else {
      // 1. 포트원 액세스 토큰 발급
      const tokenRes = await fetch('https://api.iamport.kr/users/getToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imp_key: process.env.IMP_KEY,
          imp_secret: process.env.IMP_SECRET,
        }),
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData?.response?.access_token;
      if (!accessToken) throw new Error('포트원 토큰 발급 실패');

      // 2. 결제 내역 조회
      const payRes = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, {
        headers: { Authorization: accessToken },
      });
      const payData = await payRes.json();
      const payment = payData?.response;
      if (!payment) throw new Error('결제 내역 조회 실패');

      // 3. 상태·금액 대조 (브라우저 위변조 차단의 핵심)
      const expectedAmount = Number(order_details?.totalPrice || order_details?.finalPrice || 0);
      if (payment.status !== 'paid') {
        verifyNote = `결제 상태 이상: ${payment.status}`;
      } else if (expectedAmount > 0 && Number(payment.amount) !== expectedAmount) {
        verifyNote = `금액 불일치! 실결제 ${payment.amount}원 vs 주문서 ${expectedAmount}원 - 위변조 의심`;
      } else {
        verified = true;
        verifyNote = `검증 완료 (${payment.amount}원, ${payment.pay_method}, ${payment.pg_provider})`;
      }
    }
  } catch (e) {
    verifyNote = '검증 중 오류: ' + e.message;
  }

  // ===== ② 사장님 이메일 알림 (Resend) =====
  let notified = false;
  try {
    if (process.env.RESEND_API_KEY && process.env.OWNER_EMAIL) {
      const d = order_details || {};
      const items = Array.isArray(d.items)
        ? d.items.map(i => `- ${i.country || ''} ${i.plan || i.dataLimit || ''} x${i.quantity || 1}`).join('<br>')
        : `${d.country || ''} ${d.plan || ''}`;
      const statusTag = isTestOrder ? '[테스트]' : verified ? '[검증완료]' : '[⚠️검증실패]';

      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JDISIM 주문알림 <onboarding@resend.dev>',
          to: [process.env.OWNER_EMAIL],
          subject: `${statusTag} 신규 주문 ${merchant_uid} - ${d.totalPrice || d.finalPrice || '?'}원`,
          html: `
            <h2>🦊 JDISIM 신규 주문</h2>
            <p><strong>주문번호:</strong> ${merchant_uid}<br>
            <strong>결제ID:</strong> ${imp_uid || '-'}<br>
            <strong>검증 결과:</strong> ${verifyNote}<br>
            <strong>구매자 이메일:</strong> ${d.email || '-'}<br>
            <strong>구매자 연락처:</strong> ${d.phone || '-'}<br>
            <strong>개통 희망일:</strong> ${d.activationDate || '-'}</p>
            <p><strong>주문 상품:</strong><br>${items}</p>
            <p><strong>결제 금액:</strong> ${d.totalPrice || d.finalPrice || '?'}원</p>
            <hr>
            <p style="color:#888;font-size:12px;">플레이오토 EMP → 수기주문 등록에 위 정보를 입력하시면 도매처가 수집하여 QR을 발송합니다.</p>
          `,
        }),
      });
      notified = mailRes.ok;
    }
  } catch (e) {
    console.error('알림 발송 실패:', e.message);
  }

  return res.status(200).json({
    received: true,
    verified,
    note: verifyNote,
    owner_notified: notified,
  });
}
