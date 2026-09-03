const express = require('express');
const router = express.Router();
const db = require('../db');
const { validateExtras } = require('../extras');

router.get('/', async (req, res) => {
  const settings = res.locals.settings;
  
  res.render('checkout', {
    title: 'Kasse – ' + settings.site_name,
    settings
  });
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, zip, notes, payment, items, discount_code } = req.body;
    
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    
    let calculatedSubtotal = 0;
    for (const item of parsedItems) {
      const product = await db.get('SELECT price, sizes FROM products WHERE id = $1', [item.id]);
      if (!product) {
        return res.status(400).json({ success: false, message: 'Produkt nicht gefunden: ' + item.name });
      }
      let realPrice;
      if (item.size && product.sizes) {
        const sizes = JSON.parse(product.sizes);
        const matchedSize = sizes.find(s => s.label === item.size.label && parseFloat(s.price) === parseFloat(item.size.price));
        if (!matchedSize) {
          return res.status(400).json({ success: false, message: 'Ungültige Größe für: ' + item.name });
        }
        realPrice = parseFloat(matchedSize.price);
        // Extras & Beläge (Pizza): serverseitig gegen Preisliste prüfen
        try {
          const { extras, total } = validateExtras(item.size.label, item.extras);
          item.extras = extras;
          realPrice = parseFloat((realPrice + total).toFixed(2));
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Ungültige Extras für: ' + item.name });
        }
      } else {
        realPrice = parseFloat(product.price);
        delete item.extras;
      }
      // Notiz pro Position (aus der Kasse), max. 200 Zeichen
      if (typeof item.note === 'string' && item.note.trim()) {
        item.note = item.note.trim().slice(0, 200);
      } else {
        delete item.note;
      }
      const qty = Math.max(1, Math.min(20, parseInt(item.qty) || 1));
      item.price = realPrice;
      item.qty = qty;
      calculatedSubtotal += realPrice * qty;
    }
    
    const settings = res.locals.settings;
    const deliveryFee = parseFloat(settings.delivery_fee) || 4.50;
    const freeFrom = parseFloat(settings.free_delivery_from) || 0;
    const calculatedDelivery = calculatedSubtotal >= freeFrom ? 0 : deliveryFee;
    
    let calculatedDiscount = 0;
    let validCode = null;
    if (discount_code) {
      const now = new Date().toISOString().split('T')[0];
      const discount = await db.get(`SELECT * FROM discounts WHERE code = $1 AND active = 1 AND (expires_at IS NULL OR expires_at > $2) AND (usage_limit = 0 OR used_count < usage_limit)`, [discount_code, now]);
      if (discount && (!discount.min_order || calculatedSubtotal >= parseFloat(discount.min_order))) {
        validCode = discount_code;
        calculatedDiscount = discount.type === 'prozent'
          ? (calculatedSubtotal * parseFloat(discount.value) / 100)
          : parseFloat(discount.value);
      }
    }
    
    const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedDelivery - calculatedDiscount);
    
    const orderNumber = 'FEIN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    await db.run(`INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_zip, notes, items, subtotal, delivery_fee, discount, discount_code, total, payment_method, payment_status, order_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [orderNumber, name, email, phone, address, city, zip, notes,
      JSON.stringify(parsedItems), calculatedSubtotal, calculatedDelivery, calculatedDiscount, validCode, calculatedTotal,
      payment, payment === 'online' ? 'ausstehend' : 'bar', 'neu']
    );
    
    if (validCode) {
      await db.run('UPDATE discounts SET used_count = used_count + 1 WHERE code = $1', [validCode]);
    }
    
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
  
  const settings = res.locals.settings;
  
  res.render('order-confirmation', {
    title: 'Bestellung ' + order.order_number + ' – ' + settings.site_name,
    order,
    settings
  });
});

module.exports = router;
