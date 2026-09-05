const express = require('express');
const router = express.Router();
const db = require('../db');
const { TOPPINGS, FISH_TOPPINGS, EXTRA_PRICES, KAESERAND } = require('../extras');
const pizzaExtras = { toppings: TOPPINGS, fish: FISH_TOPPINGS, prices: EXTRA_PRICES, kaeserand: KAESERAND };

router.get('/', async (req, res) => {
  const categories = await db.all('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order');
  // Hero-Deals (nur über Hero-Button bestellbar) nicht in der Speisekarte zeigen
  const products = await db.all("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id IN (SELECT MIN(id) FROM products WHERE is_available = 1 GROUP BY name) AND p.slug NOT IN ('deal-grosse-pizza-getraenke','deal-mix-match','deal-grosse-hamburger-getraenk','deal-night-abholung') ORDER BY c.sort_order, p.sort_order");
  const settings = res.locals.settings;
  
  res.render('menu', {
    title: 'Speisekarte – ' + settings.site_name,
    categories,
    products,
    settings,
    activeCategory: null,
    pizzaExtras
  });
});

router.get('/kategorie/:slug', async (req, res) => {
  const category = await db.get('SELECT * FROM categories WHERE slug = $1 AND active = 1', [req.params.slug]);
  if (!category) return res.status(404).render('404', { title: 'Kategorie nicht gefunden' });
  
  const products = await db.all("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id IN (SELECT MIN(id) FROM products WHERE category_id = $1 AND is_available = 1 GROUP BY name) AND p.slug NOT IN ('deal-grosse-pizza-getraenke','deal-mix-match','deal-grosse-hamburger-getraenk','deal-night-abholung') ORDER BY p.sort_order", [category.id]);
  const categories = await db.all('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order');
  const settings = res.locals.settings;
  
  res.render('menu', {
    title: category.name + ' – ' + settings.site_name,
    categories,
    products,
    activeCategory: category.slug,
    settings,
    pizzaExtras
  });
});

router.get('/produkt/:slug', async (req, res) => {
  const product = await db.get('SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = $1', [req.params.slug]);
  if (!product) return res.status(404).render('404', { title: 'Produkt nicht gefunden' });
  
  const related = await db.all('SELECT * FROM products WHERE category_id = $1 AND id != $2 AND is_available = 1 LIMIT 4', [product.category_id, product.id]);
  const settings = res.locals.settings;
  
  res.render('product-detail', {
    title: product.name + ' – ' + settings.site_name,
    product,
    related,
    settings,
    activeMenu: 'speisekarte',
    pizzaExtras,
    isPizza: product.category_slug === 'pizza'
  });
});

module.exports = router;
