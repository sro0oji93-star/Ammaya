const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_available = 1 ORDER BY c.sort_order, p.sort_order').all();
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('menu', {
    title: 'Speisekarte – ' + settings.site_name,
    categories,
    products,
    settings,
    activeCategory: null
  });
});

router.get('/kategorie/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!category) return res.status(404).render('404', { title: 'Kategorie nicht gefunden' });
  
  const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.is_available = 1 ORDER BY p.sort_order').all(category.id);
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('menu', {
    title: category.name + ' – ' + settings.site_name,
    categories,
    products,
    activeCategory: category.slug,
    settings
  });
});

router.get('/produkt/:slug', (req, res) => {
  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?').get(req.params.slug);
  if (!product) return res.status(404).render('404', { title: 'Produkt nicht gefunden' });
  
  const related = db.prepare('SELECT * FROM products WHERE category_id = ? AND id != ? AND is_available = 1 LIMIT 4').all(product.category_id, product.id);
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('product-detail', {
    title: product.name + ' – ' + settings.site_name,
    product,
    related,
    settings,
    activeMenu: 'speisekarte'
  });
});

module.exports = router;
