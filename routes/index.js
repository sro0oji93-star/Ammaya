const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const products = db.prepare('SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_available = 1 ORDER BY c.sort_order, p.sort_order').all();
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const banners = db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order').all();
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE active = 1 ORDER BY RANDOM() LIMIT 3').all();
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('index', {
    title: settings.site_name + ' – ' + settings.site_description,
    bodyClass: 'homepage',
    products,
    categories,
    banners,
    testimonials,
    settings
  });
});

module.exports = router;
