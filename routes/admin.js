const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const auth = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login', error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (admin && bcrypt.compareSync(password, admin.password)) {
    req.session.admin = { id: admin.id, username: admin.username, display_name: admin.display_name };
    return res.redirect('/admin');
  }
  res.render('admin/login', { title: 'Admin Login', error: 'Ungültige Anmeldedaten' });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

router.get('/', auth, (req, res) => {
  const stats = {
    products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
    categories: db.prepare('SELECT COUNT(*) as count FROM categories').get().count,
    orders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
    pending: db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'neu' OR order_status = 'in_bearbeitung'").get().count,
    revenue: db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE order_status != 'storniert'").get().total,
    recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all()
  };
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  res.render('admin/dashboard', { title: 'Dashboard – Admin', stats, settings });
});

router.get('/produkte', auth, (req, res) => {
  const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order').all();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.render('admin/products', { title: 'Produkte – Admin', products, categories });
});

router.post('/produkte', auth, upload.single('image'), (req, res) => {
  const { name, category_id, description, price, old_price, ingredients, is_featured, is_available, sort_order } = req.body;
  const slug = slugify(name, { lower: true, strict: true });
  const image = req.file ? '/uploads/' + req.file.filename : null;
  db.prepare(`INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    category_id || null, name, slug + '-' + Date.now(), description, price, old_price || null,
    image, ingredients, is_featured ? 1 : 0, is_available ? 1 : 0, sort_order || 0
  );
  res.redirect('/admin/produkte');
});

router.post('/produkte/bearbeiten/:id', auth, upload.single('image'), (req, res) => {
  const { name, category_id, description, price, old_price, ingredients, is_featured, is_available, sort_order } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).send('Produkt nicht gefunden');
  const slug = slugify(name, { lower: true, strict: true }) + '-' + req.params.id;
  const image = req.file ? '/uploads/' + req.file.filename : product.image;
  db.prepare(`UPDATE products SET category_id=?, name=?, slug=?, description=?, price=?, old_price=?, image=?, ingredients=?, is_featured=?, is_available=?, sort_order=? WHERE id=?`).run(
    category_id || null, name, slug, description, price, old_price || null, image, ingredients,
    is_featured ? 1 : 0, is_available ? 1 : 0, sort_order || 0, req.params.id
  );
  res.redirect('/admin/produkte');
});

router.post('/produkte/loeschen/:id', auth, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/produkte');
});

router.get('/kategorien', auth, (req, res) => {
  const categories = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count FROM categories c ORDER BY sort_order').all();
  res.render('admin/categories', { title: 'Kategorien – Admin', categories });
});

router.post('/kategorien', auth, (req, res) => {
  const { name, description, sort_order } = req.body;
  const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();
  db.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)').run(name, slug, description, sort_order || 0);
  res.redirect('/admin/kategorien');
});

router.post('/kategorien/bearbeiten/:id', auth, (req, res) => {
  const { name, description, sort_order, active } = req.body;
  db.prepare('UPDATE categories SET name=?, description=?, sort_order=?, active=? WHERE id=?').run(name, description, sort_order || 0, active ? 1 : 0, req.params.id);
  res.redirect('/admin/kategorien');
});

router.post('/kategorien/loeschen/:id', auth, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.redirect('/admin/kategorien');
});

router.get('/bestellungen', auth, (req, res) => {
  const status = req.query.status || 'alle';
  let orders;
  if (status === 'alle') {
    orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE order_status = ? ORDER BY created_at DESC').all(status);
  }
  res.render('admin/orders', { title: 'Bestellungen – Admin', orders, currentStatus: status });
});

router.post('/bestellungen/status/:id', auth, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/admin/bestellungen');
});

router.get('/bestellungen/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).send('Bestellung nicht gefunden');
  order.items = JSON.parse(order.items);
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  res.render('admin/order-detail', { title: 'Bestellung ' + order.order_number, order, settings });
});

router.get('/rabatte', auth, (req, res) => {
  const discounts = db.prepare('SELECT * FROM discounts ORDER BY created_at DESC').all();
  res.render('admin/discounts', { title: 'Rabatte – Admin', discounts });
});

router.post('/rabatte', auth, (req, res) => {
  const { code, type, value, min_order, usage_limit, expires_at } = req.body;
  db.prepare('INSERT INTO discounts (code, type, value, min_order, usage_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    code.toUpperCase(), type, value, min_order || 0, usage_limit || 0, expires_at || null
  );
  res.redirect('/admin/rabatte');
});

router.post('/rabatte/loeschen/:id', auth, (req, res) => {
  db.prepare('DELETE FROM discounts WHERE id = ?').run(req.params.id);
  res.redirect('/admin/rabatte');
});

router.get('/banner', auth, (req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order').all();
  res.render('admin/banners', { title: 'Banner – Admin', banners });
});

router.post('/banner', auth, upload.single('image'), (req, res) => {
  const { title, subtitle, link, sort_order } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : null;
  db.prepare('INSERT INTO banners (title, subtitle, image, link, sort_order) VALUES (?, ?, ?, ?, ?)').run(title, subtitle, image, link, sort_order || 0);
  res.redirect('/admin/banner');
});

router.post('/banner/loeschen/:id', auth, (req, res) => {
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  res.redirect('/admin/banner');
});

router.get('/einstellungen', auth, (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  res.render('admin/settings', { title: 'Einstellungen – Admin', settings });
});

router.post('/einstellungen', auth, upload.fields([
  { name: 'hero_burger_image', maxCount: 1 },
  { name: 'hero_pizza_image', maxCount: 1 }
]), (req, res) => {
  const allowed = ['site_name','site_description','address','phone','email','opening_hours','delivery_fee','free_delivery_from','social_instagram','social_facebook','social_tiktok','hero_title','hero_subtitle','about_title','about_text','latitude','longitude','hero_price','hero_price_label','hero_text_title','hero_text_subtitle'];
  const update = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      update.run(req.body[key], key);
    }
  }
  if (req.files && req.files.hero_burger_image && req.files.hero_burger_image[0]) {
    update.run('/uploads/' + req.files.hero_burger_image[0].filename, 'hero_burger_image');
  }
  if (req.files && req.files.hero_pizza_image && req.files.hero_pizza_image[0]) {
    update.run('/uploads/' + req.files.hero_pizza_image[0].filename, 'hero_pizza_image');
  }
  res.redirect('/admin/einstellungen');
});

router.get('/passwort', auth, (req, res) => {
  res.render('admin/password', { title: 'Passwort ändern – Admin', message: null, error: null });
});

router.post('/passwort', auth, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.admin.id);
  if (!bcrypt.compareSync(current_password, admin.password)) {
    return res.render('admin/password', { title: 'Passwort ändern – Admin', message: null, error: 'Aktuelles Passwort ist falsch' });
  }
  if (new_password !== confirm_password) {
    return res.render('admin/password', { title: 'Passwort ändern – Admin', message: null, error: 'Passwörter stimmen nicht überein' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hash, req.session.admin.id);
  res.render('admin/password', { title: 'Passwort ändern – Admin', message: 'Passwort erfolgreich geändert!', error: null });
});

module.exports = router;
