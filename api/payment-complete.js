// 결제완료 수집 훅 (PlayAuto/관리자용 주문기록). 2026-07-16 하드닝(T-001):
//   기존: process.cwd()/data/orders.json 파일쓰기 → Vercel 읽기전용 FS라 매번 500·미영속.
//   변경: 프록시 KV(order-store)로 영속화 우선 + 파일은 best-effort. 어떤 경우도 500 대신 200.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROXY_STORE = 'https://jdisim-proxy.vercel.app/api/order';
const INGEST = process.env.JDIOS_INGEST_KEY || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  try {
    const { merchant_uid, status } = req.body || {};
    if (status !== 'paid') return res.status(200).json({ success: false, message: '결제 미완료 건 — 수집 제외' });
    const orderData = req.body.order_details;
    if (!orderData || !merchant_uid) return res.status(400).json({ success: false, error: '주문 정보 없음' });

    const email = String(orderData.email || '');
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const record = {
      UniqueId: crypto.randomBytes(8).toString('hex'),
      SiteCode: 'JDISIM',
      OrderCode: merchant_uid,
      OrderName: orderData.buyerName || email.split('@')[0] || '고객',
      OrderTel: orderData.phone || '',
      RecipientName: orderData.buyerName || email.split('@')[0] || '고객',
      RecipientTel: orderData.phone || '',
      Email: email,
      RecipientZip: '00000',
      RecipientAddress: '이메일/알림톡 발송 (무배송 상품)',
      OrderDate: new Date().toISOString(),
      Price: orderData.totalPrice || 0,
      Count: items.length,
      Test: orderData.test === true,
      ActivationDate: orderData.activationDate || '',
      ProdName: items.map(it => (it.country || '') + ' ' + (it.carrier || '')).join(', '),
      items: items,
    };

    // 1) KV 영속화(프록시) — 서버리스에서도 지속. JDIOS_INGEST_KEY env 없으면 스킵.
    let persisted = false;
    if (INGEST) {
      try {
        const r = await fetch(PROXY_STORE, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: INGEST, order: record }),
        });
        persisted = r.ok;
      } catch (e) { /* 네트워크 실패 — 아래 파일 폴백 */ }
    }

    // 2) 파일 저장(best-effort) — 로컬/영속 FS 환경에서만. 읽기전용이면 조용히 스킵.
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const filePath = path.join(dataDir, 'orders.json');
      let orders = [];
      if (fs.existsSync(filePath)) orders = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
      if (!orders.find(o => o.OrderCode === merchant_uid)) {
        orders.push(record);
        fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf8');
      }
    } catch (e) { /* Vercel 읽기전용 FS — KV로 대체됨 */ }

    // persisted:false 어드민 가시화 (2026-07-17): 주문 KV 저장 실패는 조용히 넘어가면 유실 — support 큐로 신고(텔레그램 notify 연동)
    if (!persisted) {
      try {
        await fetch('https://jdisim-proxy.vercel.app/api/support', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: 'SYSTEM', msg: '[주문저장실패] ' + merchant_uid + ' — KV 영속 실패(env/프록시 확인), 주문 유실 위험 · 수동 대장 기록 필요', from: 'payment-complete' }),
        });
      } catch (e) { /* 신고 실패는 결제 흐름에 영향 주지 않음 */ }
    }
    return res.status(200).json({ success: true, persisted, message: persisted ? '주문 접수·저장 완료' : '주문 접수(KV 미연동 — env 확인)' });
  } catch (error) {
    // 수집 실패가 결제/영수증을 막지 않도록 200 유지
    return res.status(200).json({ success: false, error: String(error.message || error).slice(0, 200) });
  }
};
