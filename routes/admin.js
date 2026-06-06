const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const slugify = require('slugify');
const auth = require('../middleware/auth');

function bufferToDataUri(buffer, mimetype) {
  return 'data:' + mimetype + ';base64,' + buffer.toString('base64');
}

const storage = multer.memoryStorage();
const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilder (JPEG, PNG, GIF, WebP, SVG) sind erlaubt'), false);
  }
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login', error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await db.get('SELECT * FROM admins WHERE username = $1', [username]);
  if (admin && bcrypt.compareSync(password, admin.password)) {
    req.session.admin = { id: admin.id, username: admin.username, display_name: admin.display_name };
    return res.redirect('/admin');
  }
  res.render('admin/login', { title: 'Admin Login', error: 'Ungültige Anmeldedaten' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

router.get('/', auth, async (req, res) => {
  const stats = {
    products: (await db.get('SELECT COUNT(*) as count FROM products')).count,
    categories: (await db.get('SELECT COUNT(*) as count FROM categories')).count,
    orders: (await db.get('SELECT COUNT(*) as count FROM orders')).count,
    pending: (await db.get("SELECT COUNT(*) as count FROM orders WHERE order_status = 'neu' OR order_status = 'in_bearbeitung'")).count,
    revenue: (await db.get("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE order_status != 'storniert'")).total,
    recentOrders: await db.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'),
    unreadMessages: (await db.get("SELECT COUNT(*) as count FROM contact_messages WHERE is_read = 0")).count
  };
  const settings = res.locals.settings;
  res.render('admin/dashboard', { title: 'Dashboard – Admin', stats, settings });
});

router.get('/produkte', auth, async (req, res) => {
  const products = await db.all('SELECT DISTINCT ON (p.name) p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name, p.id DESC');
  const categories = await db.all('SELECT * FROM categories ORDER BY sort_order');
  res.render('admin/products', { title: 'Produkte – Admin', products, categories, duplicate: req.query.duplicate === '1' });
});

router.post('/produkte', auth, upload.single('image'), async (req, res) => {
  const { name, category_id, description, price, old_price, ingredients, is_featured, is_available, sort_order, sizes } = req.body;
  const slug = slugify(name, { lower: true, strict: true });
  const image = req.file ? bufferToDataUri(req.file.buffer, req.file.mimetype) : null;
  const existing = await db.get('SELECT id FROM products WHERE name = $1', [name]);
  if (existing) {
    return res.redirect('/admin/produkte?duplicate=1');
  }
  let sizesJson = null;
  if (sizes) {
    try { sizesJson = JSON.stringify(JSON.parse(sizes)); } catch (e) { sizesJson = null; }
  }
  await db.run(`INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [category_id || null, name, slug + '-' + Date.now(), description, price, old_price || null,
    image, ingredients, is_featured ? 1 : 0, is_available ? 1 : 0, sort_order || 0, sizesJson]
  );
  res.redirect('/admin/produkte');
});

router.post('/produkte/bearbeiten/:id', auth, upload.single('image'), async (req, res) => {
  const { name, category_id, description, price, old_price, ingredients, is_featured, is_available, sort_order, sizes } = req.body;
  const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!product) return res.status(404).send('Produkt nicht gefunden');
  const slug = slugify(name, { lower: true, strict: true }) + '-' + req.params.id;
  const image = req.file ? bufferToDataUri(req.file.buffer, req.file.mimetype) : product.image;
  let sizesJson = product.sizes;
  if (sizes !== undefined) {
    try { sizesJson = JSON.stringify(JSON.parse(sizes)); } catch (e) { sizesJson = product.sizes; }
  }
  await db.run(`UPDATE products SET category_id=$1, name=$2, slug=$3, description=$4, price=$5, old_price=$6, image=$7, ingredients=$8, is_featured=$9, is_available=$10, sort_order=$11, sizes=$12 WHERE id=$13`,
    [category_id || null, name, slug, description, price, old_price || null, image, ingredients,
    is_featured ? 1 : 0, is_available ? 1 : 0, sort_order || 0, sizesJson, req.params.id]
  );
  res.redirect('/admin/produkte');
});

router.post('/produkte/loeschen/:id', auth, async (req, res) => {
  await db.run('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.redirect('/admin/produkte');
});

router.get('/kategorien', auth, async (req, res) => {
  const categories = await db.all('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count FROM categories c ORDER BY sort_order');
  res.render('admin/categories', { title: 'Kategorien – Admin', categories });
});

router.post('/kategorien', auth, async (req, res) => {
  const { name, description, sort_order } = req.body;
  const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();
  await db.run('INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)',
    [name, slug, description, sort_order || 0]);
  res.redirect('/admin/kategorien');
});

router.post('/kategorien/bearbeiten/:id', auth, async (req, res) => {
  const { name, description, sort_order, active } = req.body;
  await db.run('UPDATE categories SET name=$1, description=$2, sort_order=$3, active=$4 WHERE id=$5',
    [name, description, sort_order || 0, active ? 1 : 0, req.params.id]);
  res.redirect('/admin/kategorien');
});

router.post('/kategorien/loeschen/:id', auth, async (req, res) => {
  await db.run('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.redirect('/admin/kategorien');
});

router.get('/bestellungen', auth, async (req, res) => {
  const status = req.query.status || 'alle';
  let orders;
  if (status === 'alle') {
    orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
  } else {
    orders = await db.all('SELECT * FROM orders WHERE order_status = $1 ORDER BY created_at DESC', [status]);
  }
  res.render('admin/orders', { title: 'Bestellungen – Admin', orders, currentStatus: status });
});

router.post('/bestellungen/status/:id', auth, async (req, res) => {
  const { status } = req.body;
  await db.run('UPDATE orders SET order_status = $1 WHERE id = $2', [status, req.params.id]);
  res.redirect('/admin/bestellungen');
});

router.get('/bestellungen/:id', auth, async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).send('Bestellung nicht gefunden');
  order.items = JSON.parse(order.items);
  const settings = res.locals.settings;
  res.render('admin/order-detail', { title: 'Bestellung ' + order.order_number, order, settings });
});

router.get('/rabatte', auth, async (req, res) => {
  const discounts = await db.all('SELECT * FROM discounts ORDER BY created_at DESC');
  res.render('admin/discounts', { title: 'Rabatte – Admin', discounts });
});

router.post('/rabatte', auth, async (req, res) => {
  const { code, type, value, min_order, usage_limit, expires_at } = req.body;
  await db.run('INSERT INTO discounts (code, type, value, min_order, usage_limit, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [code.toUpperCase(), type, value, min_order || 0, usage_limit || 0, expires_at || null]);
  res.redirect('/admin/rabatte');
});

router.post('/rabatte/loeschen/:id', auth, async (req, res) => {
  await db.run('DELETE FROM discounts WHERE id = $1', [req.params.id]);
  res.redirect('/admin/rabatte');
});

router.get('/banner', auth, async (req, res) => {
  const banners = await db.all('SELECT * FROM banners ORDER BY sort_order');
  res.render('admin/banners', { title: 'Banner – Admin', banners });
});

router.post('/banner', auth, upload.single('image'), async (req, res) => {
  const { title, subtitle, link, sort_order } = req.body;
  const image = req.file ? bufferToDataUri(req.file.buffer, req.file.mimetype) : null;
  await db.run('INSERT INTO banners (title, subtitle, image, link, sort_order) VALUES ($1, $2, $3, $4, $5)',
    [title, subtitle, image, link, sort_order || 0]);
  res.redirect('/admin/banner');
});

router.post('/banner/loeschen/:id', auth, async (req, res) => {
  await db.run('DELETE FROM banners WHERE id = $1', [req.params.id]);
  res.redirect('/admin/banner');
});

router.get('/testimonials', auth, async (req, res) => {
  const testimonials = await db.all('SELECT * FROM testimonials ORDER BY created_at DESC');
  res.render('admin/testimonials', { title: 'Testimonials – Admin', testimonials });
});

router.post('/testimonials', auth, upload.single('image'), async (req, res) => {
  const { name, text, rating } = req.body;
  const image = req.file ? bufferToDataUri(req.file.buffer, req.file.mimetype) : null;
  await db.run('INSERT INTO testimonials (name, text, rating, image) VALUES ($1, $2, $3, $4)',
    [name, text, rating || 5, image]);
  res.redirect('/admin/testimonials');
});

router.post('/testimonials/bearbeiten/:id', auth, upload.single('image'), async (req, res) => {
  const { name, text, rating, active } = req.body;
  const t = await db.get('SELECT * FROM testimonials WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).send('Testimonial nicht gefunden');
  const image = req.file ? bufferToDataUri(req.file.buffer, req.file.mimetype) : t.image;
  await db.run('UPDATE testimonials SET name=$1, text=$2, rating=$3, image=$4, active=$5 WHERE id=$6',
    [name, text, rating || 5, image, active ? 1 : 0, req.params.id]);
  res.redirect('/admin/testimonials');
});

router.post('/testimonials/loeschen/:id', auth, async (req, res) => {
  await db.run('DELETE FROM testimonials WHERE id = $1', [req.params.id]);
  res.redirect('/admin/testimonials');
});

router.get('/einstellungen', auth, async (req, res) => {
  const settings = res.locals.settings;
  res.render('admin/settings', { title: 'Einstellungen – Admin', settings });
});

router.post('/einstellungen', auth, upload.fields([
  { name: 'hero_burger_image', maxCount: 1 },
  { name: 'hero_pizza_image', maxCount: 1 }
]), async (req, res) => {
  const allowed = ['site_name','site_description','address','phone','email','opening_hours','delivery_fee','free_delivery_from','social_instagram','social_facebook','social_tiktok','hero_title','hero_subtitle','about_title','about_text','latitude','longitude','hero_price','hero_price_label','hero_text_title','hero_text_subtitle'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      await db.run('UPDATE settings SET value = $1 WHERE key = $2', [req.body[key], key]);
    }
  }
  if (req.files && req.files.hero_burger_image && req.files.hero_burger_image[0]) {
    await db.run('UPDATE settings SET value = $1 WHERE key = $2', [bufferToDataUri(req.files.hero_burger_image[0].buffer, req.files.hero_burger_image[0].mimetype), 'hero_burger_image']);
  }
  if (req.files && req.files.hero_pizza_image && req.files.hero_pizza_image[0]) {
    await db.run('UPDATE settings SET value = $1 WHERE key = $2', [bufferToDataUri(req.files.hero_pizza_image[0].buffer, req.files.hero_pizza_image[0].mimetype), 'hero_pizza_image']);
  }
  res.redirect('/admin/einstellungen');
});

router.get('/kontakt', auth, async (req, res) => {
  const messages = await db.all('SELECT * FROM contact_messages ORDER BY created_at DESC');
  res.render('admin/contact', { title: 'Kontaktnachrichten – Admin', messages });
});

router.post('/kontakt/gelesen/:id', auth, async (req, res) => {
  await db.run('UPDATE contact_messages SET is_read = 1 WHERE id = $1', [req.params.id]);
  res.redirect('/admin/kontakt');
});

router.post('/kontakt/loeschen/:id', auth, async (req, res) => {
  await db.run('DELETE FROM contact_messages WHERE id = $1', [req.params.id]);
  res.redirect('/admin/kontakt');
});

router.get('/passwort', auth, (req, res) => {
  res.render('admin/password', { title: 'Passwort ändern – Admin', message: null, error: null });
});

router.post('/passwort', auth, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const admin = await db.get('SELECT * FROM admins WHERE id = $1', [req.session.admin.id]);
  if (!bcrypt.compareSync(current_password, admin.password)) {
    return res.render('admin/password', { title: 'Passwort ändern – Admin', message: null, error: 'Aktuelles Passwort ist falsch' });
  }
  if (new_password !== confirm_password) {
    return res.render('admin/password', { title: 'Passwort ändern – Admin', message: null, error: 'Passwörter stimmen nicht überein' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  await db.run('UPDATE admins SET password = $1 WHERE id = $2', [hash, req.session.admin.id]);
  res.render('admin/password', { title: 'Passwort ändern – Admin', message: 'Passwort erfolgreich geändert!', error: null });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send('Datei zu groß. Maximal 5 MB erlaubt.');
    }
    return res.status(400).send('Fehler beim Dateiupload: ' + err.message);
  }
  if (err) {
    return res.status(400).send(err.message || 'Ein Fehler ist aufgetreten');
  }
  next();
});

module.exports = router;
