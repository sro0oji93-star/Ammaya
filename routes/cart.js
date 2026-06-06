const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const settings = res.locals.settings;
  const now = new Date().toISOString().split('T')[0];
  const discounts = await db.all('SELECT * FROM discounts WHERE active = 1 AND (expires_at IS NULL OR expires_at > $1)', [now]);
  
  res.render('cart', {
    title: 'Warenkorb – ' + settings.site_name,
    settings,
    discounts
  });
});

module.exports = router;
