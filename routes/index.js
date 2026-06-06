const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const products = await db.all("SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id IN (SELECT MIN(id) FROM products WHERE is_available = 1 GROUP BY name) ORDER BY c.sort_order, p.sort_order");
  const categories = await db.all('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order');
  const banners = await db.all('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order');
  const testimonials = await db.all('SELECT * FROM testimonials WHERE active = 1 ORDER BY RANDOM() LIMIT 3');
  const settingsRows = await db.all('SELECT key, value FROM settings');
  const settings = Object.fromEntries(settingsRows.map(s => [s.key, s.value]));
  
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
