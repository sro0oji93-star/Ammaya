const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  const now = new Date().toISOString().split('T')[0];
  const discounts = db.prepare('SELECT * FROM discounts WHERE active = 1 AND (expires_at IS NULL OR expires_at > ?)').all(now);
  
  res.render('cart', {
    title: 'Warenkorb – ' + settings.site_name,
    settings,
    discounts
  });
});

module.exports = router;
