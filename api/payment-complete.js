const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { imp_uid, merchant_uid, status } = req.body;

    if (status !== 'paid') {
      return res.status(200).json({ success: false, message: '결제 미완료 건으로 수집 대상 제외' });
    }

    const orderData = req.body.order_details;
    if (!orderData) {
      return res.status(400).json({ success: false, error: '주문 상세 정보가 없습니다.' });
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, 'orders.json');
    let orders = [];
    
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      orders = JSON.parse(fileData || '[]');
    }
    
    if (!orders.find(o => o.OrderCode === merchant_uid)) {
      orders.push({
        UniqueId: crypto.randomBytes(8).toString('hex'),
        SiteCode: 'JDISIM',
        OrderCode: merchant_uid,
        OrderName: orderData.email.split('@')[0],
        OrderTel: orderData.phone,
        RecipientName: orderData.email.split('@')[0],
        RecipientTel: orderData.phone,
        RecipientZip: "00000",
        RecipientAddress: "이메일/알림톡 발송 (무배송 상품)",
        OrderDate: new Date().toISOString(),
        Price: orderData.totalPrice,
        Count: orderData.items.length,
        ProdName: orderData.items.map(item => item.country + ' ' + item.carrier).join(', '),
        items: orderData.items
      });
      
      fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf8');
    }

    return res.status(200).json({ success: true, message: '주문 접수 완료' });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
