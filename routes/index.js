const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  // Hero-Deals (nur über Hero-Button bestellbar) nicht im Homepage-Raster zeigen
  const products = await db.all("SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id IN (SELECT MIN(id) FROM products WHERE is_available = 1 GROUP BY name) AND p.slug NOT IN ('deal-grosse-pizza-getraenke','deal-mix-match','deal-grosse-hamburger-getraenk','deal-night-abholung') ORDER BY c.sort_order, p.sort_order");
  // Deals separat für den Hero-Button laden (bleiben bestellbar, aber unsichtbar im Menü)
  const heroDeals = await db.all("SELECT * FROM products WHERE slug IN ('deal-grosse-pizza-getraenke','deal-mix-match','deal-grosse-hamburger-getraenk','deal-night-abholung') AND is_available = 1");
  const categories = await db.all('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order');
  const banners = await db.all('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order');
  const testimonials = await db.all('SELECT * FROM testimonials WHERE active = 1 ORDER BY RANDOM() LIMIT 3');
  const heroSlides = await db.all('SELECT * FROM hero_slides WHERE active = 1 ORDER BY sort_order');
  const settings = res.locals.settings;
  
  res.render('index', {
    title: settings.site_name + ' – ' + settings.site_description,
    bodyClass: 'homepage',
    products,
    heroDeals,
    categories,
    banners,
    testimonials,
    heroSlides,
    settings
  });
});

module.exports = router;
