const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', async (req, res) => {
  const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingsRows.forEach(s => settings[s.key] = s.value);
  const now = new Date().toISOString().split('T')[0];
  const discounts = await db.prepare('SELECT * FROM discounts WHERE active = 1 AND (expires_at IS NULL OR expires_at > ?)').all(now);
  
  res.render('cart', {
    title: 'Warenkorb – ' + settings.site_name,
    settings,
    discounts
  });
});

module.exports = router;
