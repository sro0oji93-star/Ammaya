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

    CREATE TABLE IF NOT EXISTS hero_slides (
      id SERIAL PRIMARY KEY,
      sort_order INTEGER DEFAULT 0,
      line1 TEXT DEFAULT '1 GROSSE',
      line2 TEXT DEFAULT 'PIZZA',
      line3 TEXT DEFAULT '+ 4 GETRÄNKE',
      price1 TEXT DEFAULT '19',
      price1_cents TEXT DEFAULT ',99€',
      price1_tag TEXT DEFAULT 'ABHOLUNG',
      price2 TEXT DEFAULT '21',
      price2_cents TEXT DEFAULT ',99€',
      price2_tag TEXT DEFAULT 'LIEFERUNG',
      description TEXT DEFAULT '',
      button_text TEXT DEFAULT 'JETZT BESTELLEN',
      button_link TEXT DEFAULT '/speisekarte',
      bg_image TEXT DEFAULT '/images/revolution/6cbea-bg1.jpg',
      main_image TEXT DEFAULT '/images/revolution/75ec1-big1.png',
      drink_tl TEXT DEFAULT '/images/revolution/f13af-big3.png',
      drink_tr TEXT DEFAULT '/images/revolution/d70da-big4.png',
      drink_br TEXT DEFAULT '/images/revolution/96fdd-big6.png',
      active INTEGER DEFAULT 1
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT;
  `);

  const hash = bcrypt.hashSync('admin123', 10);
  await query(
    'INSERT INTO admins (username, password, display_name) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
    ['admin', hash, 'Admin']
  );

  const catCount = (await get('SELECT COUNT(*) as count FROM categories')).count;
  if (catCount === 0) {
    const categories = [
      ['Pizza', 'pizza', 'Italienische Steinofenpizza, knusprig und frisch belegt', 1],
      ['Burger', 'burger', 'Smash Burger frisch für dich gesmasht. Für nur 5,00 € Aufpreis als Menü: 4 Zwiebelringe oder Pommes und ein 0,33 l Softdrink nach Wahl.', 2],
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
  }

  const prodCount = (await get('SELECT COUNT(*) as count FROM products')).count;
  if (prodCount === 0) {
    const products = [
      [1, 'Margherita', 'margherita', 'Tomatensauce, Mozzarella, frischer Basilikum', 9.90, null, 'Tomatensauce, Mozzarella, Basilikum', 1, 1],
      [1, 'Salami', 'salami', 'Tomatensauce, Mozzarella, pikante Salami', 11.90, null, 'Tomatensauce, Mozzarella, Salami', 1, 2],
      [1, 'Prosciutto', 'prosciutto', 'Tomatensauce, Mozzarella, luftgetrockneter Schinken, Rucola', 13.90, null, 'Tomatensauce, Mozzarella, Schinken, Rucola', 0, 3],
      [2, 'Hamburger Smash', 'hamburger-smash', '110 g Smash Beef, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 8.90, null, '110 g Smash Beef, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 0, 4],
      [2, 'Cheeseburger Smash', 'cheeseburger-smash', '110 g Smash Beef, Cheddar, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 9.90, null, '110 g Smash Beef, Cheddar, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 1, 5],
      [2, 'Chickenburger', 'chickenburger', 'Crispy Chicken, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Chicken Sauce', 9.90, null, 'Crispy Chicken, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Chicken Sauce', 0, 6],
      [2, 'Fischburger', 'fischburger', 'Fischfilet, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Remoulade', 9.90, null, 'Fischfilet, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Remoulade', 0, 7],
      [2, 'Veggieburger', 'veggieburger', 'Veggie Patty, Salat, Tomate, Veggie Sauce', 8.90, null, 'Veggie Patty, Salat, Tomate, Veggie Sauce', 0, 8],
      [2, 'Double Smash', 'double-smash', '2x 110 g Smash Beef, 2x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 12.90, null, '2x 110 g Smash Beef, 2x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 1, 9],
      [2, 'Triple Smash', 'triple-smash', '3x 110 g Smash Beef, 3x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 16.90, null, '3x 110 g Smash Beef, 3x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 0, 10],
      [2, 'Bacon BBQ Smash', 'bacon-bbq-smash', '2x 110 g Smash Beef, Cheddar, Bacon, Röstzwiebeln, Gewürzgurken, BBQ Sauce', 13.90, null, '2x 110 g Smash Beef, Cheddar, Bacon, Röstzwiebeln, Gewürzgurken, BBQ Sauce', 1, 11],
      [2, 'Mushroom Smash', 'mushroom-smash', '110 g Smash Beef, Champignons, karamellisierte Zwiebeln, Cheddar, Smash Sauce', 10.90, null, '110 g Smash Beef, Champignons, karamellisierte Zwiebeln, Cheddar, Smash Sauce', 0, 12],
      [2, 'Chicken Smash', 'chicken-smash', '110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, Chicken Sauce', 10.90, null, '110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, Chicken Sauce', 0, 13],
      [2, 'BoomBurger', 'boomburger', '3x 110 g Smash Beef, 3x Cheddar, Spiegelei, Champignons, Boom Sauce', 17.90, null, '3x 110 g Smash Beef, 3x Cheddar, Spiegelei, Champignons, Boom Sauce', 1, 14],
      [2, 'Beef & Chicken Smash', 'beef-chicken-smash', '110 g Smash Beef, 110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, NEXO Sauce', 13.90, null, '110 g Smash Beef, 110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, NEXO Sauce', 0, 15],
      // Hinweis: Produktbilder für neue Burger-Slugs stehen in views/menu.ejs (productImgMap), damit kein Pizza-Fallback angezeigt wird
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
  }

  // Auto-Migration Burger 2026-09-03: immer ausführen, damit Render-DB ohne Shell aktualisiert wird
  // Löscht die 3 alten Burger und stellt die 12 Smash-Burger per Upsert sicher (idempotent, Admin-Bilder bleiben erhalten)
  try {
    const burgerCat = await get("SELECT * FROM categories WHERE slug = 'burger'");
    if (burgerCat) {
      await query('UPDATE categories SET description = $1 WHERE id = $2',
        ['Smash Burger frisch für dich gesmasht. Für nur 5,00 € Aufpreis als Menü: 4 Zwiebelringe oder Pommes und ein 0,33 l Softdrink nach Wahl.', burgerCat.id]);
      await query("DELETE FROM products WHERE category_id = $1 AND slug IN ('classic-burger','cheese-burger','chicken-burger')", [burgerCat.id]);
      const smashBurgers = [
        ['Hamburger Smash', 'hamburger-smash', '110 g Smash Beef, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 8.90, '110 g Smash Beef, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 0, 4, '/images/products/img13.jpg'],
        ['Cheeseburger Smash', 'cheeseburger-smash', '110 g Smash Beef, Cheddar, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 9.90, '110 g Smash Beef, Cheddar, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 1, 5, '/images/products/img14.jpg'],
        ['Chickenburger', 'chickenburger', 'Crispy Chicken, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Chicken Sauce', 9.90, 'Crispy Chicken, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Chicken Sauce', 0, 6, '/images/products/img13.jpg'],
        ['Fischburger', 'fischburger', 'Fischfilet, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Remoulade', 9.90, 'Fischfilet, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Remoulade', 0, 7, null],
        ['Veggieburger', 'veggieburger', 'Veggie Patty, Salat, Tomate, Veggie Sauce', 8.90, 'Veggie Patty, Salat, Tomate, Veggie Sauce', 0, 8, null],
        ['Double Smash', 'double-smash', '2x 110 g Smash Beef, 2x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 12.90, '2x 110 g Smash Beef, 2x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 1, 9, null],
        ['Triple Smash', 'triple-smash', '3x 110 g Smash Beef, 3x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 16.90, '3x 110 g Smash Beef, 3x Cheddar, Zwiebeln, Gewürzgurken, Smash Sauce', 0, 10, null],
        ['Bacon BBQ Smash', 'bacon-bbq-smash', '2x 110 g Smash Beef, Cheddar, Bacon, Röstzwiebeln, Gewürzgurken, BBQ Sauce', 13.90, '2x 110 g Smash Beef, Cheddar, Bacon, Röstzwiebeln, Gewürzgurken, BBQ Sauce', 1, 11, null],
        ['Mushroom Smash', 'mushroom-smash', '110 g Smash Beef, Champignons, karamellisierte Zwiebeln, Cheddar, Smash Sauce', 10.90, '110 g Smash Beef, Champignons, karamellisierte Zwiebeln, Cheddar, Smash Sauce', 0, 12, null],
        ['Chicken Smash', 'chicken-smash', '110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, Chicken Sauce', 10.90, '110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, Chicken Sauce', 0, 13, null],
        ['BoomBurger', 'boomburger', '3x 110 g Smash Beef, 3x Cheddar, Spiegelei, Champignons, Boom Sauce', 17.90, '3x 110 g Smash Beef, 3x Cheddar, Spiegelei, Champignons, Boom Sauce', 1, 14, null],
        ['Beef & Chicken Smash', 'beef-chicken-smash', '110 g Smash Beef, 110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, NEXO Sauce', 13.90, '110 g Smash Beef, 110 g Smash Chicken, Cheddar, Zwiebeln, Gewürzgurken, NEXO Sauce', 0, 15, null],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image] of smashBurgers) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, image=COALESCE(products.image, EXCLUDED.image)`,
          [burgerCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order]
        );
      }
      // Backfill: falls alte Zeilen noch NULL-Bilder haben (z.B. erste Migration), Burger-Bilder nachtragen
      const burgerImgFallback = {
        'fischburger': '/images/products/img13.jpg', 'veggieburger': '/images/products/img14.jpg',
        'double-smash': '/images/products/img14.jpg', 'triple-smash': '/images/products/img13.jpg',
        'bacon-bbq-smash': '/images/products/img14.jpg', 'mushroom-smash': '/images/products/img13.jpg',
        'chicken-smash': '/images/products/img13.jpg', 'boomburger': '/images/products/img14.jpg',
        'beef-chicken-smash': '/images/products/img14.jpg'
      };
      for (const [slug, img] of Object.entries(burgerImgFallback)) {
        await query('UPDATE products SET image = $1 WHERE slug = $2 AND image IS NULL', [img, slug]);
      }
      // Schwarzes Burger-Bild (img15) entfernen: durch normales Burger-Bild ersetzen
      await query("UPDATE products SET image = '/images/products/img13.jpg' WHERE image = '/images/products/img15.jpg' AND category_id = $1", [burgerCat.id]);
    }
  } catch (e) {
    console.error('Burger Auto-Migration übersprungen:', e.message);
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

    ['about_title', 'Unsere Philosophie'],
    ['about_text', 'Bei Ammaya vereinen wir internationale Küche mit Leidenschaft. Jedes Gericht wird mit Sorgfalt zubereitet, um Ihnen ein unvergessliches Geschmackserlebnis zu bieten. Wir verwenden ausschließlich frische Zutaten und legen größten Wert auf Qualität.'],
    ['primary_color', '#eb0029'],
    ['secondary_color', '#ff4d4d'],
    ['logo_url', ''],
    ['font_family', 'Inter'],
  ];
  for (const [key, value] of defaultSettings) {
    await query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [key, value]
    );
  }

  // Ensure hero_slides table has correct schema and data
  try {
    const probe = await query(`SELECT COUNT(*) as cnt FROM hero_slides WHERE line1 IS NOT NULL AND line1 != ''`);
    if (probe.rows[0].cnt === 0) {
      // Table has old schema or empty data - drop and recreate
      await query(`DROP TABLE IF EXISTS hero_slides CASCADE`);
    }
  } catch (e) {
    // Column doesn't exist - drop and recreate
    try { await query(`DROP TABLE IF EXISTS hero_slides CASCADE`); } catch (e2) {}
  }
  await query(`
    CREATE TABLE IF NOT EXISTS hero_slides (
      id SERIAL PRIMARY KEY,
      sort_order INTEGER DEFAULT 0,
      line1 TEXT DEFAULT '',
      line2 TEXT DEFAULT '',
      line3 TEXT DEFAULT '',
      price1 TEXT DEFAULT '',
      price1_cents TEXT DEFAULT '',
      price1_tag TEXT DEFAULT '',
      price2 TEXT DEFAULT '',
      price2_cents TEXT DEFAULT '',
      price2_tag TEXT DEFAULT '',
      description TEXT DEFAULT '',
      button_text TEXT DEFAULT 'JETZT BESTELLEN',
      button_link TEXT DEFAULT '/speisekarte',
      bg_image TEXT DEFAULT '',
      main_image TEXT DEFAULT '',
      drink_tl TEXT DEFAULT '',
      drink_tr TEXT DEFAULT '',
      drink_br TEXT DEFAULT '',
      active INTEGER DEFAULT 1
    );
  `);

  // Seed default hero slides
  const existingSlides = await query('SELECT COUNT(*) as cnt FROM hero_slides');
  if (existingSlides.rows[0].cnt === 0) {
    await query(`INSERT INTO hero_slides (sort_order, line1, line2, line3, price1, price1_cents, price1_tag, price2, price2_cents, price2_tag, description, button_text, button_link, bg_image, main_image, drink_tl, drink_tr, drink_br) VALUES (0, '1 GROSSE', 'PIZZA', '+ 4 GETRÄNKE', '19', ',99€', 'ABHOLUNG', '21', ',99€', 'LIEFERUNG', 'Bestellen Sie eine große 3-Belag-Pizza und erhalten Sie 4 Getränke (330ml) gratis!', 'JETZT BESTELLEN', '/speisekarte', '/images/revolution/6cbea-bg1.jpg', '/images/revolution/75ec1-big1.png', '/images/revolution/f13af-big3.png', '/images/revolution/d70da-big4.png', '/images/revolution/96fdd-big6.png')`);
    await query(`INSERT INTO hero_slides (sort_order, line1, line2, line3, price1, price1_cents, price1_tag, price2, price2_cents, price2_tag, description, button_text, button_link, bg_image, main_image, drink_tl, drink_tr, drink_br) VALUES (1, 'MIX OR MATCH', 'COMBO DEAL', 'SPECIAL', '9', ',99€', 'ABHOLUNG', '11', ',99€', 'LIEFERUNG', 'Includes 1 burger, 1 small fries, 1 dip and 1 drink (330ml)', 'JETZT BESTELLEN', '/speisekarte', '/images/revolution/6cbea-bg1.jpg', '/images/revolution/5b6b6-burger.png', '/images/revolution/5fb1e-glass.png', '/images/revolution/6e11b-donut3.png', '/images/revolution/f1de6-donut2.png')`);
  }
}

module.exports = { query, get, all, run, pool, initialize };
