const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-KEY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const VALID_API_KEY = process.env.PLAYAUTO_API_KEY || 'm 9ea26f1ebff70bc24b09878eab1caaf9';

  if (!apiKey || apiKey.trim() !== VALID_API_KEY.trim()) {
    return res.status(401).json({ status: "false", message: "Unauthorized" });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'orders.json');
    let orders = [];

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      orders = JSON.parse(fileData || '[]');
    }

    if (orders.length === 0) {
      return res.status(200).json({ status: "false", message: "No orders found." });
    }

    return res.status(200).json(orders);

  } catch (error) {
    return res.status(500).json({ status: "false", message: error.message });
  }
};
