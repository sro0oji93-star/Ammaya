const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('checkout', {
    title: 'Kasse – ' + settings.site_name,
    settings
  });
});

router.post('/', (req, res) => {
  try {
    const { name, email, phone, address, city, zip, notes, payment, items, subtotal, delivery_fee, discount, discount_code, total } = req.body;
    
    const orderNumber = 'FEIN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    
    const result = db.prepare(`INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_zip, notes, items, subtotal, delivery_fee, discount, discount_code, total, payment_method, payment_status, order_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      orderNumber, name, email, phone, address, city, zip, notes,
      JSON.stringify(parsedItems), subtotal, delivery_fee, discount, discount_code || null, total,
      payment, payment === 'online' ? 'ausstehend' : 'bar', 'neu'
    );
    
    res.json({ success: true, orderNumber, message: 'Bestellung erfolgreich aufgegeben!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Fehler bei der Bestellung' });
  }
});

router.post('/rabatt-pruefen', (req, res) => {
  const { code, subtotal } = req.body;
  const now = new Date().toISOString().split('T')[0];
  const discount = db.prepare(`SELECT * FROM discounts WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > ?) AND (usage_limit = 0 OR used_count < usage_limit)`).get(code, now);
  
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

router.get('/bestellung/:orderNumber', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(req.params.orderNumber);
  if (!order) return res.status(404).render('404', { title: 'Bestellung nicht gefunden' });
  
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('order-confirmation', {
    title: 'Bestellung ' + order.order_number + ' – ' + settings.site_name,
    order,
    settings
  });
});

module.exports = router;
