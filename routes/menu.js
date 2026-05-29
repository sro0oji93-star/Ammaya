const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', async (req, res) => {
  const categories = await db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const products = await db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_available = 1 ORDER BY c.sort_order, p.sort_order').all();
  const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingsRows.forEach(s => settings[s.key] = s.value);
  
  res.render('menu', {
    title: 'Speisekarte – ' + settings.site_name,
    categories,
    products,
    settings,
    activeCategory: null
  });
});

router.get('/kategorie/:slug', async (req, res) => {
  const category = await db.prepare('SELECT * FROM categories WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!category) return res.status(404).render('404', { title: 'Kategorie nicht gefunden' });
  
  const products = await db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.is_available = 1 ORDER BY p.sort_order').all(category.id);
  const categories = await db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingsRows.forEach(s => settings[s.key] = s.value);
  
  res.render('menu', {
    title: category.name + ' – ' + settings.site_name,
    categories,
    products,
    activeCategory: category.slug,
    settings
  });
});

router.get('/produkt/:slug', async (req, res) => {
  const product = await db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?').get(req.params.slug);
  if (!product) return res.status(404).render('404', { title: 'Produkt nicht gefunden' });
  
  const related = await db.prepare('SELECT * FROM products WHERE category_id = ? AND id != ? AND is_available = 1 LIMIT 4').all(product.category_id, product.id);
  const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingsRows.forEach(s => settings[s.key] = s.value);
  
  res.render('product-detail', {
    title: product.name + ' – ' + settings.site_name,
    product,
    related,
    settings
  });
});

module.exports = router;
