const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const featured = db.prepare('SELECT * FROM products WHERE is_featured = 1 AND is_available = 1 ORDER BY sort_order').all();
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const banners = db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order').all();
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE active = 1 ORDER BY RANDOM() LIMIT 3').all();
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('index', {
    title: settings.site_name + ' – ' + settings.site_description,
    bodyClass: 'homepage',
    featured,
    categories,
    banners,
    testimonials,
    settings
  });
});

module.exports = router;
