const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pool = null;
let initialized = false;

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function initDatabase() {
  if (initialized) return;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });

  await pool.query('SELECT 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      old_price DECIMAL(10,2),
      image TEXT,
      ingredients TEXT,
      is_featured INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      delivery_address TEXT,
      delivery_city TEXT,
      delivery_zip TEXT,
      notes TEXT,
      items TEXT NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      discount_code TEXT,
      total DECIMAL(10,2) NOT NULL,
      payment_method TEXT DEFAULT 'bar',
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'neu',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      type TEXT NOT NULL DEFAULT 'prozent',
      value DECIMAL(10,2) NOT NULL,
      min_order DECIMAL(10,2) DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at TIMESTAMP,
      usage_limit INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      image TEXT,
      link TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const adminCount = await pool.query('SELECT COUNT(*)::int as count FROM admins');
  if (adminCount.rows[0].count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO admins (username, password, display_name) VALUES ($1, $2, $3)', ['admin', hash, 'Admin']);
  }

  const catCount = await pool.query('SELECT COUNT(*)::int as count FROM categories');
  if (catCount.rows[0].count === 0) {
    await pool.query("INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)", ['Vorspeisen', 'vorspeisen', 'Leichte Köstlichkeiten für den perfekten Start', 1]);
    await pool.query("INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)", ['Hauptgerichte', 'hauptgerichte', 'Herzhafte Meisterwerke der internationalen Küche', 2]);
    await pool.query("INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)", ['Pasta & Risotto', 'pasta-risotto', 'Italienische Klassiker, frisch zubereitet', 3]);
    await pool.query("INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)", ['Salate', 'salate', 'Frische und kreative Salatkreationen', 4]);
    await pool.query("INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)", ['Desserts', 'desserts', 'Süße Verführungen für den perfekten Abschluss', 5]);
    await pool.query("INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)", ['Getränke', 'getraenke', 'Erfrischende Getränke und erlesene Weine', 6]);
  }

  const prodCount = await pool.query('SELECT COUNT(*)::int as count FROM products');
  if (prodCount.rows[0].count === 0) {
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [2, 'Filetsteak vom Black Angus', 'filetsteak-black-angus', 'Zartes Black Angus Filetsteak mit Kräuterbutter, Ofengemüse und Kartoffelgratin', 34.90, 39.90, 'Black Angus Rind, Kräuterbutter, saisonales Gemüse, Kartoffeln', 1, 1]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [2, 'Lachsfilet auf Spinatbett', 'lachsfilet-spinatbett', 'Frisches Lachsfilet auf cremigem Spinatbett mit Risotto und Zitronen-Dill-Soße', 26.90, null, 'Lachs, Blattspinat, Risotto, Zitrone, Dill', 1, 2]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [2, 'Hähnchenbrust gefüllt', 'haehnchenbrust-gefuellt', 'Saftige Hähnchenbrust gefüllt mit Mozzarella und getrockneten Tomaten', 22.90, null, 'Hähnchenbrust, Mozzarella, getrocknete Tomaten, Kräuter', 0, 3]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [3, 'Tagliatelle al Tartufo', 'tagliatelle-tartufo', 'Frische Tagliatelle mit schwarzem Trüffel und Parmigiano', 28.50, null, 'Tagliatelle, schwarzer Trüffel, Parmigiano, Butter', 1, 4]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [3, 'Risotto ai Funghi', 'risotto-funghi', 'Cremiges Risotto mit Steinpilzen und Trüffelöl', 24.50, 27.50, 'Risotto, Steinpilze, Trüffelöl, Parmesan', 0, 5]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [1, 'Bruschetta Classica', 'bruschetta-classica', 'Geröstetes Ciabatta mit Tomaten, Basilikum und Büffelmozzarella', 12.90, null, 'Ciabatta, Tomaten, Basilikum, Büffelmozzarella', 0, 6]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [1, 'Garnelen im Knoblauchmantel', 'garnelen-knoblauch', 'Gebratene Garnelen in Knoblauchöl mit Chili und frischem Baguette', 16.50, null, 'Garnelen, Knoblauch, Chili, Baguette', 1, 7]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [5, 'Tiramisu Classico', 'tiramisu-classico', 'Italienisches Tiramisu mit Mascarpone und Espresso', 11.90, null, 'Mascarpone, Espresso, Löffelbiskuit, Kakao', 1, 8]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [5, 'Crème Brûlée', 'creme-brulee', 'Klassische Crème Brûlée mit Vanille und karamellisierter Zuckerhaube', 10.90, null, 'Vanille, Sahne, Eigelb, Zucker', 0, 9]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [4, 'Caesar Salad', 'caesar-salad', 'Römersalat mit Hähnchenstreifen, Croutons und Parmesan-Dressing', 16.90, null, 'Römersalat, Hähnchen, Croutons, Parmesan, Dressing', 0, 10]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [4, 'Mediterraner Salat', 'mediterraner-salat', 'Gegrilltes Gemüse mit Feta, Oliven und Pinienkernen', 15.50, 17.50, 'Gegrilltes Gemüse, Feta, Oliven, Pinienkerne', 0, 11]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [6, 'Hausgemachte Limonade', 'hausgemachte-limonade', 'Erfrischende Limonade mit Minze und Zitrone', 5.90, null, 'Zitrone, Minze, Zucker, Sprudelwasser', 0, 12]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [6, 'Barolo Riserva DOCG', 'barolo-riserva', 'Kräftiger Rotwein aus dem Piemont, Jahrgang 2018', 42.00, null, 'Nebbiolo Trauben', 1, 13]);
    await pool.query("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [6, 'Espresso Doppio', 'espresso-doppio', 'Doppelter Espresso aus unserer Hausröstung', 4.50, null, 'Arabica Bohnen', 0, 14]);
  }

  const settingCount = await pool.query("SELECT COUNT(*)::int as count FROM settings");
  if (settingCount.rows[0].count === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['site_name', 'Feinschmeckerei']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['site_description', 'Premium Restaurant & Feinschmecker-Erlebnis']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['address', 'Friedrichstraße 42, 10117 Berlin']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['phone', '+49 30 123456789']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['email', 'info@feinschmeckerei.de']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['opening_hours', 'Mo\u2013So: 11:30 \u2013 22:30']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['delivery_fee', '4.50']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['free_delivery_from', '40.00']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['social_instagram', 'https://instagram.com/feinschmeckerei']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['social_facebook', 'https://facebook.com/feinschmeckerei']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['social_tiktok', 'https://tiktok.com/@feinschmeckerei']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['google_maps_key', 'YOUR_GOOGLE_MAPS_KEY']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['latitude', '52.520008']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['longitude', '13.404954']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['hero_title', 'Genuss auf h\u00f6chstem Niveau']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['hero_subtitle', 'Entdecken Sie unsere exquisiten Gerichte \u2013 frisch zubereitet mit den besten Zutaten']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['about_title', 'Unsere Philosophie']);
    await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['about_text', 'In unserer Feinschmeckerei vereinen wir traditionelle Kochkunst mit modernen Einfl\u00fcssen. Jedes Gericht wird mit Leidenschaft und Sorgfalt zubereitet, um Ihnen ein unvergessliches Geschmackserlebnis zu bieten. Wir verwenden ausschlie\u00dflich frische, regionale Produkte und legen gr\u00f6\u00dften Wert auf Qualit\u00e4t und Pr\u00e4sentation.']);
  }

  initialized = true;
  console.log('PostgreSQL database initialized');
}

const db = {
  prepare: (sql) => ({
    all: async (...params) => {
      if (!initialized) throw new Error('Database not initialized. Call initDatabase() first.');
      const res = await pool.query(toPg(sql), params);
      return res.rows;
    },
    get: async (...params) => {
      if (!initialized) throw new Error('Database not initialized. Call initDatabase() first.');
      const res = await pool.query(toPg(sql), params);
      return res.rows[0] || null;
    },
    run: async (...params) => {
      if (!initialized) throw new Error('Database not initialized. Call initDatabase() first.');
      const isInsert = /^\s*INSERT/i.test(sql.trim());
      const q = toPg(sql) + (isInsert ? ' RETURNING id' : '');
      const res = await pool.query(q, params);
      return { changes: res.rowCount, lastInsertRowid: isInsert && res.rows[0] ? res.rows[0].id : null };
    },
  }),
};

module.exports = { db, initDatabase };
