const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'restaurant.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initialize() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      type TEXT NOT NULL DEFAULT 'prozent',
      value DECIMAL(10,2) NOT NULL,
      min_order DECIMAL(10,2) DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at DATETIME,
      usage_limit INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      image TEXT,
      link TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

  `);

  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === '0' || adminCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO admins (username, password, display_name) VALUES (?, ?, ?)").run('admin', hash, 'Admin');
  }

  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === '0' || catCount.count === 0) {
    const insertCat = db.prepare("INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)");
    insertCat.run('Pizza', 'pizza', 'Italienische Steinofenpizza, knusprig und frisch belegt', 1);
    insertCat.run('Burger', 'burger', 'Saftige Burger mit handgemachten Pattys und frischen Zutaten', 2);
    insertCat.run('Croque', 'croque', 'Französisch inspirierte Croques, goldbraun überbacken', 3);
    insertCat.run('Salat', 'salat', 'Frische Salatkreationen mit hausgemachten Dressings', 4);
    insertCat.run('Pasta', 'pasta', 'Italienische Pastagerichte, traditionell und kreativ', 5);
    insertCat.run('Schnitzel', 'schnitzel', 'Knusprige Schnitzelvariationen', 6);
    insertCat.run('Snacks', 'snacks', 'Kleine Köstlichkeiten für den Hunger zwischendurch', 7);
    insertCat.run('Getränke', 'getraenke', 'Erfrischende Getränke und Erfrischungen', 8);
    insertCat.run('Snack Rolls', 'snack-rolls', 'Herzhafte gefüllte Rollen, perfekt zum Teilen', 9);
    insertCat.run('Saucen & Dips', 'saucen-dips', 'Hausgemachte Saucen und Dips für jeden Geschmack', 10);
  }

  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (prodCount.count === '0' || prodCount.count === 0) {
    const insertProd = db.prepare("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertProd.run(1, 'Margherita', 'margherita', 'Tomatensauce, Mozzarella, frischer Basilikum', 9.90, null, 'Tomatensauce, Mozzarella, Basilikum', 1, 1);
    insertProd.run(1, 'Salami', 'salami', 'Tomatensauce, Mozzarella, pikante Salami', 11.90, null, 'Tomatensauce, Mozzarella, Salami', 1, 2);
    insertProd.run(1, 'Prosciutto', 'prosciutto', 'Tomatensauce, Mozzarella, luftgetrockneter Schinken, Rucola', 13.90, null, 'Tomatensauce, Mozzarella, Schinken, Rucola', 0, 3);
    insertProd.run(2, 'Classic Burger', 'classic-burger', 'Rinderpattie, Cheddar, Salat, Tomate, Zwiebeln, hausgemachte Sauce', 14.90, null, 'Rindfleisch, Cheddar, Salat, Tomate, Zwiebeln', 1, 4);
    insertProd.run(2, 'Cheese Burger', 'cheese-burger', 'Rinderpattie, doppelter Cheddar, Gurken, karamellisierte Zwiebeln', 15.90, null, 'Rindfleisch, Cheddar, Gurken, Zwiebeln', 0, 5);
    insertProd.run(2, 'Chicken Burger', 'chicken-burger', 'Knuspriges Hähnchenfilet, Eisbergsalat, Tomate, Knoblauchsauce', 13.90, null, 'Hähnchen, Salat, Tomate, Knoblauchsauce', 0, 6);
    insertProd.run(3, 'Croque Monsieur', 'croque-monsieur', 'Toast mit Schinken und Käse überbacken mit Béchamelsauce', 8.90, null, 'Toast, Schinken, Käse, Béchamelsauce', 1, 7);
    insertProd.run(3, 'Croque Madame', 'croque-madame', 'Croque Monsieur mit Spiegelei und Trüffelmayo', 10.90, null, 'Toast, Schinken, Käse, Béchamelsauce, Ei, Trüffelmayo', 0, 8);
    insertProd.run(3, 'Croque Hawaii', 'croque-hawaii', 'Toast mit Schinken, Ananas und Käse überbacken', 9.90, null, 'Toast, Schinken, Ananas, Käse', 0, 9);
    insertProd.run(4, 'Griechischer Salat', 'griechischer-salat', 'Frischer Salat mit Feta, Oliven, Gurken, Tomaten und Oregano-Dressing', 11.90, null, 'Feta, Oliven, Gurke, Tomate, Oregano', 1, 10);
    insertProd.run(4, 'Caesar Salat', 'caesar-salat', 'Römersalat mit Hähnchen, Croutons, Parmesan und Caesar-Dressing', 12.90, null, 'Römersalat, Hähnchen, Croutons, Parmesan', 0, 11);
    insertProd.run(5, 'Spaghetti Bolognese', 'spaghetti-bolognese', 'Spaghetti mit hausgemachter Fleischsoße und Parmesan', 12.90, null, 'Spaghetti, Rinderhack, Tomaten, Parmesan', 1, 12);
    insertProd.run(5, 'Penne Arrabiata', 'penne-arrabiata', 'Penne in scharfer Tomatensoße mit Knoblauch und Chili', 10.90, null, 'Penne, Tomaten, Knoblauch, Chili', 0, 13);
    insertProd.run(6, 'Wiener Schnitzel', 'wiener-schnitzel', 'Kalbfleisch paniert und goldbraun gebraten, mit Preiselbeeren und Zitrone', 16.90, null, 'Kalbfleisch, Panade, Preiselbeeren, Zitrone', 1, 14);
    insertProd.run(6, 'Jägerschnitzel', 'jaegerschnitzel', 'Schweineschnitzel mit cremiger Pilzsoße und Pommes', 15.90, null, 'Schweinefleisch, Pilze, Sahne, Pommes', 0, 15);
    insertProd.run(6, 'Zigeunerschnitzel', 'zigeunerschnitzel', 'Schnitzel mit bunter Paprika-Zwiebel-Soße und Reis', 15.90, null, 'Schweinefleisch, Paprika, Zwiebeln, Reis', 0, 16);
    insertProd.run(7, 'Pommes Frites', 'pommes-frites', 'Knusprige Pommes mit hausgemachter Mayo oder Ketchup', 5.90, null, 'Kartoffeln, Pflanzenöl', 0, 17);
    insertProd.run(7, 'Chicken Nuggets', 'chicken-nuggets', 'Knusprige Hähnchen-Nuggets mit Dipsauce', 8.90, null, 'Hähnchen, Panade, Dip', 0, 18);
    insertProd.run(7, 'Nachos', 'nachos', 'Knusprige Nachos mit Käsesauce, Jalapeños und Sour Cream', 9.90, null, 'Nachos, Käse, Jalapeños, Sour Cream', 0, 19);
    insertProd.run(8, 'Coca Cola', 'coca-cola', 'Eisgekühlte Coca Cola 0,33l', 3.50, null, null, 0, 20);
    insertProd.run(8, 'Fanta', 'fanta', 'Eisgekühlte Fanta 0,33l', 3.50, null, null, 0, 21);
    insertProd.run(8, 'Wasser', 'wasser', 'Natürliches Mineralwasser mit Kohlensäure 0,75l', 3.00, null, null, 0, 22);
    insertProd.run(9, 'Frühlingsrolle', 'fruehlingsrolle', 'Knusprige Frühlingsrollen mit süß-saurer Dippsauce', 6.90, null, 'Teig, Gemüse, Glasnudeln', 0, 23);
    insertProd.run(9, 'Falafel Wrap', 'falafel-wrap', 'Vegetarischer Wrap mit Falafel, Hummus und frischem Gemüse', 8.90, null, 'Falafel, Hummus, Gemüse, Fladenbrot', 0, 24);
    insertProd.run(10, 'Ketchup', 'ketchup', 'Hausgemachter Ketchup 50ml', 1.50, null, null, 0, 25);
    insertProd.run(10, 'Mayonnaise', 'mayonnaise', 'Hausgemachte Mayonnaise 50ml', 1.50, null, null, 0, 26);
    insertProd.run(10, 'Knoblauchsauce', 'knoblauchsauce', 'Cremige Knoblauchsauce 50ml', 1.50, null, null, 0, 27);
    insertProd.run(10, 'Chillisauce', 'chillisauce', 'Scharfe Chillisauce 50ml', 1.50, null, null, 0, 28);
  }

  const settingCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingCount.count === '0' || settingCount.count === 0) {
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    insertSetting.run('site_name', 'Ammaya');
    insertSetting.run('site_description', 'Ihr Restaurant für Pizza, Burger und mehr');
    insertSetting.run('address', 'Musterstraße 42, 10117 Berlin');
    insertSetting.run('phone', '+49 30 123456789');
    insertSetting.run('email', 'info@ammaya.de');
    insertSetting.run('opening_hours', 'Mo\u2013So: 11:30 \u2013 22:30');
    insertSetting.run('delivery_fee', '4.50');
    insertSetting.run('free_delivery_from', '30.00');
    insertSetting.run('social_instagram', 'https://instagram.com/ammaya');
    insertSetting.run('social_facebook', 'https://facebook.com/ammaya');
    insertSetting.run('social_tiktok', 'https://tiktok.com/@ammaya');
    insertSetting.run('google_maps_key', 'YOUR_GOOGLE_MAPS_KEY');
    insertSetting.run('latitude', '52.520008');
    insertSetting.run('longitude', '13.404954');
    insertSetting.run('hero_title', 'Willkommen bei Ammaya');
    insertSetting.run('hero_subtitle', 'Entdecken Sie unsere vielfältigen Gerichte \u2013 frisch zubereitet mit den besten Zutaten');
    insertSetting.run('hero_price', '12');
    insertSetting.run('hero_price_label', 'Nur heute');
    insertSetting.run('hero_text_title', 'Burger & Pizza');
    insertSetting.run('hero_text_subtitle', 'Frisch zubereitet mit den besten Zutaten');
    insertSetting.run('hero_burger_image', '/images/revolution/5b6b6-burger.png');
    insertSetting.run('hero_pizza_image', '/images/pizza_hero.png');
    insertSetting.run('about_title', 'Unsere Philosophie');
    insertSetting.run('about_text', 'Bei Ammaya vereinen wir internationale Küche mit Leidenschaft. Jedes Gericht wird mit Sorgfalt zubereitet, um Ihnen ein unvergessliches Geschmackserlebnis zu bieten. Wir verwenden ausschließlich frische Zutaten und legen größten Wert auf Qualität.');
  }
}

initialize();

module.exports = db;
