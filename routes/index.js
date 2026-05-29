const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', async (req, res) => {
  const featured = await db.prepare('SELECT * FROM products WHERE is_featured = 1 AND is_available = 1 ORDER BY sort_order').all();
  const categories = await db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const banners = await db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order').all();
  const testimonials = await db.prepare('SELECT * FROM testimonials WHERE active = 1 ORDER BY RANDOM() LIMIT 3').all();
  const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingsRows.forEach(s => settings[s.key] = s.value);
  
  res.render('index', {
    title: settings.site_name + ' – ' + settings.site_description,
    featured,
    categories,
    banners,
    testimonials,
    settings
  });
});

module.exports = router;
