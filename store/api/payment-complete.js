/**
 * JDISIM ➡️ 플레이오토 API 연동 Vercel Serverless Function
 * 
 * [목적]
 * 결제 대행사(포트원 등)로부터 결제 완료 웹훅을 받아, 
 * 플레이오토 EMP API로 주문 정보를 전송(Push)합니다.
 */

const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { imp_uid, merchant_uid, status } = req.body;

    // 1. 결제 상태 검증
    if (status !== 'paid') {
      return res.status(200).json({ success: false, message: '결제 미완료 건으로 수집 대상 제외' });
    }

    console.log(`[결제성공 웹훅 수신] 포트원 UID: ${imp_uid}, 주문코드: ${merchant_uid}`);

    // 2. 데이터베이스에서 주문 정보 조회 (실서버 구현 시 실제 DB 조회 로직으로 대체 필요)
    // 현재는 로컬스토리지 기반이므로 임시 목업 데이터를 사용하거나 결제 시 바디로 전달받은 상세를 사용 가능
    const orderData = await getOrderMockData(merchant_uid, req.body.order_details);

    if (!orderData) {
      return res.status(404).json({ success: false, error: '주문 데이터를 찾을 수 없습니다.' });
    }

    const PLAYAUTO_API_URL = 'https://api.plto.com/v2/orders';
    const PLAYAUTO_API_KEY = process.env.PLAYAUTO_API_KEY || 'YOUR_PLAYAUTO_API_KEY';
    const PLAYAUTO_SECRET_KEY = process.env.PLAYAUTO_SECRET_KEY || '';
    const PLAYAUTO_MALL_ID = process.env.PLAYAUTO_MALL_ID || 'jdisim';

    // 3. 플레이오토 규격으로 페이로드 작성
    const playAutoPayload = {
      api_key: PLAYAUTO_API_KEY,
      signature: generateSignature(orderData, PLAYAUTO_SECRET_KEY),
      action: "order_insert",
      order_info: {
        order_num: orderData.orderCode,
        mall_id: PLAYAUTO_MALL_ID,
        mall_name: "JDISIM",
        order_date: new Date(orderData.createdAt).toISOString(),
        payment_price: orderData.totalPrice,
        buyer: {
          name: orderData.buyerName,
          phone: orderData.phone,
          email: orderData.email
        },
        receiver: {
          name: orderData.buyerName,
          phone: orderData.phone,
          zipcode: "00000",
          address1: "이메일/알림톡 실시간 전송 상품 (무배송)",
          address2: ""
        },
        items: orderData.items.map(item => ({
          product_code: item.productCode,
          product_name: item.optionName || item.productName,
          quantity: item.quantity,
          price: item.price,
          iccid_issued: item.iccid
        }))
      }
    };

    // 4. 플레이오토 서버로 전송
    const response = await axios.post(PLAYAUTO_API_URL, playAutoPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PLAYAUTO_API_KEY}`
      },
      timeout: 10000 // 10초 타임아웃
    });

    if (response.data && response.data.success) {
      console.log(`[플레이오토 연동 성공] 주문코드: ${orderData.orderCode}`);
      return res.status(200).json({ success: true, message: '플레이오토 주문 수집 처리 완료' });
    } else {
      console.error(`[플레이오토 연동 실패] 응답:`, response.data);
      return res.status(500).json({ success: false, error: response.data.message });
    }

  } catch (error) {
    console.error('[웹훅 에러]', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// HMAC-SHA256 보안 서명 생성 함수
function generateSignature(orderData, secret) {
  if (!secret || secret === 'YOUR_PLAYAUTO_SECRET_KEY') {
    return '';
  }
  const rawData = orderData.orderCode + orderData.totalPrice + secret;
  return crypto.createHmac('sha256', secret).update(rawData).digest('hex');
}

// 모의 주문 데이터 헬퍼 (실서버 구축 시 실제 DB 조회 코드로 변경)
async function getOrderMockData(merchant_uid, passedDetails) {
  if (passedDetails) {
    return {
      orderCode: merchant_uid,
      createdAt: Date.now(),
      buyerName: passedDetails.buyerName || '홍길동',
      phone: passedDetails.phone || '01012345678',
      email: passedDetails.email || 'customer@example.com',
      totalPrice: passedDetails.totalPrice || 5400,
      items: passedDetails.items || [
        {
          productCode: 'LS2026-eSIM-03176',
          productName: '일본 Softbank 매일 1GB / 5일',
          optionName: 'JSX_소프트뱅크_1GB_05일',
          quantity: 1,
          price: 5400,
          iccid: '8982300000000000001'
        }
      ]
    };
  }
  return null;
}
