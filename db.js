const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');

types.setTypeParser(1700, parseFloat);
types.setTypeParser(20, parseInt);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ammaya',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function get(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function all(text, params) {
  const result = await query(text, params);
  return result.rows;
}

async function run(text, params) {
  const result = await query(text, params);
  return result;
}

async function initialize() {
  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      old_price NUMERIC(10,2),
      image TEXT,
      ingredients TEXT,
      is_featured INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

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
      subtotal NUMERIC(10,2) NOT NULL,
      delivery_fee NUMERIC(10,2) DEFAULT 0,
      discount NUMERIC(10,2) DEFAULT 0,
      discount_code TEXT,
      total NUMERIC(10,2) NOT NULL,
      payment_method TEXT DEFAULT 'bar',
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'neu',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      type TEXT NOT NULL DEFAULT 'prozent',
      value NUMERIC(10,2) NOT NULL,
      min_order NUMERIC(10,2) DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at TIMESTAMP,
      usage_limit INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      image TEXT,
      link TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      image TEXT,
      rating INTEGER DEFAULT 5,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT;
  `);

  const hash = bcrypt.hashSync('admin123', 10);
  await query(
    'INSERT INTO admins (username, password, display_name) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
    ['admin', hash, 'Admin']
  );

  const categories = [
    ['Pizza', 'pizza', 'Italienische Steinofenpizza, knusprig und frisch belegt', 1],
    ['Burger', 'burger', 'Saftige Burger mit handgemachten Pattys und frischen Zutaten', 2],
    ['Croque', 'croque', 'Französisch inspirierte Croques, goldbraun überbacken', 3],
    ['Salat', 'salat', 'Frische Salatkreationen mit hausgemachten Dressings', 4],
    ['Pasta', 'pasta', 'Italienische Pastagerichte, traditionell und kreativ', 5],
    ['Schnitzel', 'schnitzel', 'Knusprige Schnitzelvariationen', 6],
    ['Snacks', 'snacks', 'Kleine Köstlichkeiten für den Hunger zwischendurch', 7],
    ['Getränke', 'getraenke', 'Erfrischende Getränke und Erfrischungen', 8],
    ['Snack Rolls', 'snack-rolls', 'Herzhafte gefüllte Rollen, perfekt zum Teilen', 9],
    ['Saucen & Dips', 'saucen-dips', 'Hausgemachte Saucen und Dips für jeden Geschmack', 10],
  ];
  for (const c of categories) {
    await query(
      'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING',
      c
    );
  }

  const products = [
    [1, 'Margherita', 'margherita', 'Tomatensauce, Mozzarella, frischer Basilikum', 9.90, null, 'Tomatensauce, Mozzarella, Basilikum', 1, 1],
    [1, 'Salami', 'salami', 'Tomatensauce, Mozzarella, pikante Salami', 11.90, null, 'Tomatensauce, Mozzarella, Salami', 1, 2],
    [1, 'Prosciutto', 'prosciutto', 'Tomatensauce, Mozzarella, luftgetrockneter Schinken, Rucola', 13.90, null, 'Tomatensauce, Mozzarella, Schinken, Rucola', 0, 3],
    [2, 'Classic Burger', 'classic-burger', 'Rinderpattie, Cheddar, Salat, Tomate, Zwiebeln, hausgemachte Sauce', 14.90, null, 'Rindfleisch, Cheddar, Salat, Tomate, Zwiebeln', 1, 4],
    [2, 'Cheese Burger', 'cheese-burger', 'Rinderpattie, doppelter Cheddar, Gurken, karamellisierte Zwiebeln', 15.90, null, 'Rindfleisch, Cheddar, Gurken, Zwiebeln', 0, 5],
    [2, 'Chicken Burger', 'chicken-burger', 'Knuspriges Hähnchenfilet, Eisbergsalat, Tomate, Knoblauchsauce', 13.90, null, 'Hähnchen, Salat, Tomate, Knoblauchsauce', 0, 6],
    [3, 'Croque Monsieur', 'croque-monsieur', 'Toast mit Schinken und Käse überbacken mit Béchamelsauce', 8.90, null, 'Toast, Schinken, Käse, Béchamelsauce', 1, 7],
    [3, 'Croque Madame', 'croque-madame', 'Croque Monsieur mit Spiegelei und Trüffelmayo', 10.90, null, 'Toast, Schinken, Käse, Béchamelsauce, Ei, Trüffelmayo', 0, 8],
    [3, 'Croque Hawaii', 'croque-hawaii', 'Toast mit Schinken, Ananas und Käse überbacken', 9.90, null, 'Toast, Schinken, Ananas, Käse', 0, 9],
    [4, 'Griechischer Salat', 'griechischer-salat', 'Frischer Salat mit Feta, Oliven, Gurken, Tomaten und Oregano-Dressing', 11.90, null, 'Feta, Oliven, Gurke, Tomate, Oregano', 1, 10],
    [4, 'Caesar Salat', 'caesar-salat', 'Römersalat mit Hähnchen, Croutons, Parmesan und Caesar-Dressing', 12.90, null, 'Römersalat, Hähnchen, Croutons, Parmesan', 0, 11],
    [5, 'Spaghetti Bolognese', 'spaghetti-bolognese', 'Spaghetti mit hausgemachter Fleischsoße und Parmesan', 12.90, null, 'Spaghetti, Rinderhack, Tomaten, Parmesan', 1, 12],
    [5, 'Penne Arrabiata', 'penne-arrabiata', 'Penne in scharfer Tomatensoße mit Knoblauch und Chili', 10.90, null, 'Penne, Tomaten, Knoblauch, Chili', 0, 13],
    [6, 'Wiener Schnitzel', 'wiener-schnitzel', 'Kalbfleisch paniert und goldbraun gebraten, mit Preiselbeeren und Zitrone', 16.90, null, 'Kalbfleisch, Panade, Preiselbeeren, Zitrone', 1, 14],
    [6, 'Jägerschnitzel', 'jaegerschnitzel', 'Schweineschnitzel mit cremiger Pilzsoße und Pommes', 15.90, null, 'Schweinefleisch, Pilze, Sahne, Pommes', 0, 15],
    [6, 'Zigeunerschnitzel', 'zigeunerschnitzel', 'Schnitzel mit bunter Paprika-Zwiebel-Soße und Reis', 15.90, null, 'Schweinefleisch, Paprika, Zwiebeln, Reis', 0, 16],
    [7, 'Pommes Frites', 'pommes-frites', 'Knusprige Pommes mit hausgemachter Mayo oder Ketchup', 5.90, null, 'Kartoffeln, Pflanzenöl', 0, 17],
    [7, 'Chicken Nuggets', 'chicken-nuggets', 'Knusprige Hähnchen-Nuggets mit Dipsauce', 8.90, null, 'Hähnchen, Panade, Dip', 0, 18],
    [7, 'Nachos', 'nachos', 'Knusprige Nachos mit Käsesauce, Jalapeños und Sour Cream', 9.90, null, 'Nachos, Käse, Jalapeños, Sour Cream', 0, 19],
    [8, 'Coca Cola', 'coca-cola', 'Eisgekühlte Coca Cola 0,33l', 3.50, null, null, 0, 20],
    [8, 'Fanta', 'fanta', 'Eisgekühlte Fanta 0,33l', 3.50, null, null, 0, 21],
    [8, 'Wasser', 'wasser', 'Natürliches Mineralwasser mit Kohlensäure 0,75l', 3.00, null, null, 0, 22],
    [9, 'Frühlingsrolle', 'fruehlingsrolle', 'Knusprige Frühlingsrollen mit süß-saurer Dippsauce', 6.90, null, 'Teig, Gemüse, Glasnudeln', 0, 23],
    [9, 'Falafel Wrap', 'falafel-wrap', 'Vegetarischer Wrap mit Falafel, Hummus und frischem Gemüse', 8.90, null, 'Falafel, Hummus, Gemüse, Fladenbrot', 0, 24],
    [10, 'Ketchup', 'ketchup', 'Hausgemachter Ketchup 50ml', 1.50, null, null, 0, 25],
    [10, 'Mayonnaise', 'mayonnaise', 'Hausgemachte Mayonnaise 50ml', 1.50, null, null, 0, 26],
    [10, 'Knoblauchsauce', 'knoblauchsauce', 'Cremige Knoblauchsauce 50ml', 1.50, null, null, 0, 27],
    [10, 'Chillisauce', 'chillisauce', 'Scharfe Chillisauce 50ml', 1.50, null, null, 0, 28],
  ];
  for (const p of products) {
    await query(
      `INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (slug) DO NOTHING`,
      p
    );
  }

  const defaultSettings = [
    ['site_name', 'Ammaya'],
    ['site_description', 'Ihr Restaurant für Pizza, Burger und mehr'],
    ['address', 'Musterstraße 42, 10117 Berlin'],
    ['phone', '+49 30 123456789'],
    ['email', 'info@ammaya.de'],
    ['opening_hours', 'Mo–So: 11:30 – 22:30'],
    ['delivery_fee', '4.50'],
    ['free_delivery_from', '30.00'],
    ['social_instagram', 'https://instagram.com/ammaya'],
    ['social_facebook', 'https://facebook.com/ammaya'],
    ['social_tiktok', 'https://tiktok.com/@ammaya'],
    ['google_maps_key', 'YOUR_GOOGLE_MAPS_KEY'],
    ['latitude', '52.520008'],
    ['longitude', '13.404954'],
    ['hero_title', 'Willkommen bei Ammaya'],
    ['hero_subtitle', 'Entdecken Sie unsere vielfältigen Gerichte – frisch zubereitet mit den besten Zutaten'],
    ['hero_price', '12'],
    ['hero_price_label', 'Nur heute'],
    ['hero_text_title', 'Burger & Pizza'],
    ['hero_text_subtitle', 'Frisch zubereitet mit den besten Zutaten'],
    ['hero_burger_image', '/images/revolution/5b6b6-burger.png'],
    ['hero_pizza_image', '/images/pizza_hero.png'],
    ['about_title', 'Unsere Philosophie'],
    ['about_text', 'Bei Ammaya vereinen wir internationale Küche mit Leidenschaft. Jedes Gericht wird mit Sorgfalt zubereitet, um Ihnen ein unvergessliches Geschmackserlebnis zu bieten. Wir verwenden ausschließlich frische Zutaten und legen größten Wert auf Qualität.'],
  ];
  for (const [key, value] of defaultSettings) {
    await query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [key, value]
    );
  }
}

module.exports = { query, get, all, run, pool, initialize };
