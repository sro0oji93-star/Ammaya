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
    insertCat.run('Vorspeisen', 'vorspeisen', 'Leichte Köstlichkeiten für den perfekten Start', 1);
    insertCat.run('Hauptgerichte', 'hauptgerichte', 'Herzhafte Meisterwerke der internationalen Küche', 2);
    insertCat.run('Pasta & Risotto', 'pasta-risotto', 'Italienische Klassiker, frisch zubereitet', 3);
    insertCat.run('Salate', 'salate', 'Frische und kreative Salatkreationen', 4);
    insertCat.run('Desserts', 'desserts', 'Süße Verführungen für den perfekten Abschluss', 5);
    insertCat.run('Getränke', 'getraenke', 'Erfrischende Getränke und erlesene Weine', 6);
  }

  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (prodCount.count === '0' || prodCount.count === 0) {
    const insertProd = db.prepare("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertProd.run(2, 'Filetsteak vom Black Angus', 'filetsteak-black-angus', 'Zartes Black Angus Filetsteak mit Kräuterbutter, Ofengemüse und Kartoffelgratin', 34.90, 39.90, 'Black Angus Rind, Kräuterbutter, saisonales Gemüse, Kartoffeln', 1, 1);
    insertProd.run(2, 'Lachsfilet auf Spinatbett', 'lachsfilet-spinatbett', 'Frisches Lachsfilet auf cremigem Spinatbett mit Risotto und Zitronen-Dill-Soße', 26.90, null, 'Lachs, Blattspinat, Risotto, Zitrone, Dill', 1, 2);
    insertProd.run(2, 'Hähnchenbrust gefüllt', 'haehnchenbrust-gefuellt', 'Saftige Hähnchenbrust gefüllt mit Mozzarella und getrockneten Tomaten', 22.90, null, 'Hähnchenbrust, Mozzarella, getrocknete Tomaten, Kräuter', 0, 3);
    insertProd.run(3, 'Tagliatelle al Tartufo', 'tagliatelle-tartufo', 'Frische Tagliatelle mit schwarzem Trüffel und Parmigiano', 28.50, null, 'Tagliatelle, schwarzer Trüffel, Parmigiano, Butter', 1, 4);
    insertProd.run(3, 'Risotto ai Funghi', 'risotto-funghi', 'Cremiges Risotto mit Steinpilzen und Trüffelöl', 24.50, 27.50, 'Risotto, Steinpilze, Trüffelöl, Parmesan', 0, 5);
    insertProd.run(1, 'Bruschetta Classica', 'bruschetta-classica', 'Geröstetes Ciabatta mit Tomaten, Basilikum und Büffelmozzarella', 12.90, null, 'Ciabatta, Tomaten, Basilikum, Büffelmozzarella', 0, 6);
    insertProd.run(1, 'Garnelen im Knoblauchmantel', 'garnelen-knoblauch', 'Gebratene Garnelen in Knoblauchöl mit Chili und frischem Baguette', 16.50, null, 'Garnelen, Knoblauch, Chili, Baguette', 1, 7);
    insertProd.run(5, 'Tiramisu Classico', 'tiramisu-classico', 'Italienisches Tiramisu mit Mascarpone und Espresso', 11.90, null, 'Mascarpone, Espresso, Löffelbiskuit, Kakao', 1, 8);
    insertProd.run(5, 'Crème Brûlée', 'creme-brulee', 'Klassische Crème Brûlée mit Vanille und karamellisierter Zuckerhaube', 10.90, null, 'Vanille, Sahne, Eigelb, Zucker', 0, 9);
    insertProd.run(4, 'Caesar Salad', 'caesar-salad', 'Römersalat mit Hähnchenstreifen, Croutons und Parmesan-Dressing', 16.90, null, 'Römersalat, Hähnchen, Croutons, Parmesan, Dressing', 0, 10);
    insertProd.run(4, 'Mediterraner Salat', 'mediterraner-salat', 'Gegrilltes Gemüse mit Feta, Oliven und Pinienkernen', 15.50, 17.50, 'Gegrilltes Gemüse, Feta, Oliven, Pinienkerne', 0, 11);
    insertProd.run(6, 'Hausgemachte Limonade', 'hausgemachte-limonade', 'Erfrischende Limonade mit Minze und Zitrone', 5.90, null, 'Zitrone, Minze, Zucker, Sprudelwasser', 0, 12);
    insertProd.run(6, 'Barolo Riserva DOCG', 'barolo-riserva', 'Kräftiger Rotwein aus dem Piemont, Jahrgang 2018', 42.00, null, 'Nebbiolo Trauben', 1, 13);
    insertProd.run(6, 'Espresso Doppio', 'espresso-doppio', 'Doppelter Espresso aus unserer Hausröstung', 4.50, null, 'Arabica Bohnen', 0, 14);
  }

  const settingCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingCount.count === '0' || settingCount.count === 0) {
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    insertSetting.run('site_name', 'Feinschmeckerei');
    insertSetting.run('site_description', 'Premium Restaurant & Feinschmecker-Erlebnis');
    insertSetting.run('address', 'Friedrichstraße 42, 10117 Berlin');
    insertSetting.run('phone', '+49 30 123456789');
    insertSetting.run('email', 'info@feinschmeckerei.de');
    insertSetting.run('opening_hours', 'Mo\u2013So: 11:30 \u2013 22:30');
    insertSetting.run('delivery_fee', '4.50');
    insertSetting.run('free_delivery_from', '40.00');
    insertSetting.run('social_instagram', 'https://instagram.com/feinschmeckerei');
    insertSetting.run('social_facebook', 'https://facebook.com/feinschmeckerei');
    insertSetting.run('social_tiktok', 'https://tiktok.com/@feinschmeckerei');
    insertSetting.run('google_maps_key', 'YOUR_GOOGLE_MAPS_KEY');
    insertSetting.run('latitude', '52.520008');
    insertSetting.run('longitude', '13.404954');
    insertSetting.run('hero_title', 'Genuss auf h\u00f6chstem Niveau');
    insertSetting.run('hero_subtitle', 'Entdecken Sie unsere exquisiten Gerichte \u2013 frisch zubereitet mit den besten Zutaten');
    insertSetting.run('about_title', 'Unsere Philosophie');
    insertSetting.run('about_text', 'In unserer Feinschmeckerei vereinen wir traditionelle Kochkunst mit modernen Einfl\u00fcssen. Jedes Gericht wird mit Leidenschaft und Sorgfalt zubereitet, um Ihnen ein unvergessliches Geschmackserlebnis zu bieten. Wir verwenden ausschlie\u00dflich frische, regionale Produkte und legen gr\u00f6\u00dften Wert auf Qualit\u00e4t und Pr\u00e4sentation.');
  }
}

initialize();

module.exports = db;
