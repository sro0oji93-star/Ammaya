const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const settingsRows = await db.all('SELECT key, value FROM settings');
  const settings = Object.fromEntries(settingsRows.map(s => [s.key, s.value]));
  
  res.render('checkout', {
    title: 'Kasse – ' + settings.site_name,
    settings
  });
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, zip, notes, payment, items, subtotal, delivery_fee, discount, discount_code, total } = req.body;
    
    const orderNumber = 'FEIN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    
    await db.run(`INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_zip, notes, items, subtotal, delivery_fee, discount, discount_code, total, payment_method, payment_status, order_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [orderNumber, name, email, phone, address, city, zip, notes,
      JSON.stringify(parsedItems), subtotal, delivery_fee, discount, discount_code || null, total,
      payment, payment === 'online' ? 'ausstehend' : 'bar', 'neu']
    );
    
    res.json({ success: true, orderNumber, message: 'Bestellung erfolgreich aufgegeben!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Fehler bei der Bestellung' });
  }
});

router.post('/rabatt-pruefen', async (req, res) => {
  const { code, subtotal } = req.body;
  const now = new Date().toISOString().split('T')[0];
  const discount = await db.get(`SELECT * FROM discounts WHERE code = $1 AND active = 1 AND (expires_at IS NULL OR expires_at > $2) AND (usage_limit = 0 OR used_count < usage_limit)`, [code, now]);
  
  if (!discount) return res.json({ valid: false, message: 'Rabattcode ungültig oder abgelaufen' });
  
  if (discount.min_order > 0 && subtotal < discount.min_order) {
    return res.json({ valid: false, message: 'Mindestbestellwert von ' + discount.min_order.toFixed(2) + ' € nicht erreicht' });
  }
  
  let discountValue = 0;
  if (discount.type === 'prozent') {
    discountValue = (subtotal * discount.value / 100);
  } else {
    discountValue = discount.value;
  }
  
  res.json({ valid: true, value: parseFloat(discountValue.toFixed(2)), type: discount.type, message: 'Rabatt angewendet!' });
});

router.get('/bestellung/:orderNumber', async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE order_number = $1', [req.params.orderNumber]);
  if (!order) return res.status(404).render('404', { title: 'Bestellung nicht gefunden' });
  
  const settingsRows = await db.all('SELECT key, value FROM settings');
  const settings = Object.fromEntries(settingsRows.map(s => [s.key, s.value]));
  
  res.render('order-confirmation', {
    title: 'Bestellung ' + order.order_number + ' – ' + settings.site_name,
    order,
    settings
  });
});

module.exports = router;
