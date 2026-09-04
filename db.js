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
      ['Pizza', 'pizza', 'Steinofenpizza in 4 Größen: 26 cm, 30 cm, Familien Pizza und Party. Alle Pizzen in 26 cm und 30 cm auch als Calzone erhältlich.', 1],
      ['Burger', 'burger', 'Smash Burger frisch für dich gesmasht. Für nur 5,00 € Aufpreis als Menü: 4 Zwiebelringe oder Pommes und ein 0,33 l Softdrink nach Wahl.', 2],
      ['Croque', 'croque', 'Frisch überbackene Croques. Inklusive 1 Sauce nach Wahl.', 3],
      ['Salat', 'salat', 'Frische Salate mit Dressing nach Wahl: Knoblauch, Hausdressing, Yoghurt, American, Kräuter.', 4],
      ['Pasta', 'pasta', 'Italienische Pastagerichte, traditionell und kreativ', 5],
      ['Schnitzel', 'schnitzel', 'Knusprige Schnitzelvariationen', 6],
      ['Snacks', 'snacks', 'Menü-Aufpreis +4,00 €: mit Pommes und 0,33 l Softdrink nach Wahl.', 7],
      ['Getränke', 'getraenke', 'Erfrischende Getränke und Erfrischungen', 8],
      ['Snack Rolls', 'snack-rolls', 'Herzhafte gefüllte Rollen, perfekt zum Teilen', 9],
      ['Saucen & Dips', 'saucen-dips', 'Hausgemachte Saucen und Dips für jeden Geschmack', 10],
      ['Dessert', 'dessert', 'Süße Klassiker, Crêpes, Mini Pancakes & Mini Waffeln. Alle Crêpes inklusive 2 Schokoladensorten nach Wahl.', 11],
      ['Beilagen', 'beilagen', 'Knusprige Beilagen für jeden Geschmack.', 12],
      ['Fries', 'fries', 'Knusprige Fries für jeden Geschmack.', 13],
      ['NEXO Box', 'nexo-box', 'Gemeinsam genießen & sparen.', 14],
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
      [1, 'Margherita', 'margherita', 'Tomatensauce, Oregano', 8.90, null, 'Tomatensauce, Oregano', 1, 1, '[{"label":"26 cm","price":8.9},{"label":"30 cm","price":11.5},{"label":"Familien Pizza","price":19.9},{"label":"Party 60x40","price":27.1}]'],
      [1, 'Mozzarella', 'mozzarella', 'Tomatensauce, Mozzarella, frische Tomaten, Basilikum, Oregano', 10.90, null, 'Tomatensauce, Mozzarella, frische Tomaten, Basilikum, Oregano', 0, 2, '[{"label":"26 cm","price":10.9},{"label":"30 cm","price":13.5},{"label":"Familien Pizza","price":22.9},{"label":"Party 60x40","price":31.9}]'],
      [1, 'Cheese', 'cheese', 'Tomatensauce, verschiedene Käsesorten, Oregano', 10.90, null, 'Tomatensauce, verschiedene Käsesorten, Oregano', 0, 3, '[{"label":"26 cm","price":10.9},{"label":"30 cm","price":13.5},{"label":"Familien Pizza","price":22.9},{"label":"Party 60x40","price":31.9}]'],
      [1, 'Salami', 'salami', 'Tomatensauce, Salami, Oregano', 10.20, null, 'Tomatensauce, Salami, Oregano', 1, 4, '[{"label":"26 cm","price":10.2},{"label":"30 cm","price":12.5},{"label":"Familien Pizza","price":21.5},{"label":"Party 60x40","price":30.5}]'],
      [1, 'Prosciutto', 'prosciutto', 'Tomatensauce, Schinken, Oregano', 10.20, null, 'Tomatensauce, Schinken, Oregano', 0, 5, '[{"label":"26 cm","price":10.2},{"label":"30 cm","price":12.5},{"label":"Familien Pizza","price":21.5},{"label":"Party 60x40","price":30.5}]'],
      [1, 'Funghi', 'funghi', 'Tomatensauce, Champignons, Oregano', 10.20, null, 'Tomatensauce, Champignons, Oregano', 0, 6, '[{"label":"26 cm","price":10.2},{"label":"30 cm","price":12.5},{"label":"Familien Pizza","price":21.5},{"label":"Party 60x40","price":30.5}]'],
      [1, 'Dreiklang', 'dreiklang', 'Tomatensauce, Salami, Schinken, Champignons, Oregano', 12.40, null, 'Tomatensauce, Salami, Schinken, Champignons, Oregano', 1, 7, '[{"label":"26 cm","price":12.4},{"label":"30 cm","price":14.9},{"label":"Familien Pizza","price":23.9},{"label":"Party 60x40","price":33.5}]'],
      [1, 'Hawaii', 'hawaii', 'Tomatensauce, Schinken, Ananas, Oregano', 12.20, null, 'Tomatensauce, Schinken, Ananas, Oregano', 0, 8, '[{"label":"26 cm","price":12.2},{"label":"30 cm","price":14.5},{"label":"Familien Pizza","price":23.5},{"label":"Party 60x40","price":33}]'],
      [1, 'Vegetarisch', 'vegetarisch', 'Tomatensauce, verschiedene Gemüsesorten, Oregano', 12.20, null, 'Tomatensauce, verschiedene Gemüsesorten, Oregano', 0, 9, '[{"label":"26 cm","price":12.2},{"label":"30 cm","price":14.5},{"label":"Familien Pizza","price":23.5},{"label":"Party 60x40","price":33}]'],
      [1, 'Tonno', 'tonno', 'Tomatensauce, Thunfisch, rote Zwiebeln, Oregano', 12.60, null, 'Tomatensauce, Thunfisch, rote Zwiebeln, Oregano', 0, 10, '[{"label":"26 cm","price":12.6},{"label":"30 cm","price":14.9},{"label":"Familien Pizza","price":24},{"label":"Party 60x40","price":33.5}]'],
      [1, 'Scampi', 'scampi', 'Tomatensauce, Scampi, Oregano', 14.20, null, 'Tomatensauce, Scampi, Oregano', 0, 11, '[{"label":"26 cm","price":14.2},{"label":"30 cm","price":16.5},{"label":"Familien Pizza","price":25.5},{"label":"Party 60x40","price":35.9}]'],
      [1, 'Frutti di Mare', 'frutti-di-mare', 'Tomatensauce, Frutti di Mare, Oregano', 14.20, null, 'Tomatensauce, Frutti di Mare, Oregano', 0, 12, '[{"label":"26 cm","price":14.2},{"label":"30 cm","price":16.5},{"label":"Familien Pizza","price":25.5},{"label":"Party 60x40","price":35.9}]'],
      [1, 'Spezial Chicken', 'spezial-chicken', 'Tomatensauce, Hähnchen, Paprika, rote Zwiebeln, Champignons, Oregano', 13.40, null, 'Tomatensauce, Hähnchen, Paprika, rote Zwiebeln, Champignons, Oregano', 1, 13, '[{"label":"26 cm","price":13.4},{"label":"30 cm","price":15.9},{"label":"Familien Pizza","price":24.9},{"label":"Party 60x40","price":34.9}]'],
      [1, 'Chicken Hollandaise', 'chicken-hollandaise', 'Tomatensauce, Hähnchen, Brokkoli, Sauce Hollandaise, Oregano', 13.40, null, 'Tomatensauce, Hähnchen, Brokkoli, Sauce Hollandaise, Oregano', 0, 14, '[{"label":"26 cm","price":13.4},{"label":"30 cm","price":15.9},{"label":"Familien Pizza","price":24.9},{"label":"Party 60x40","price":34.9}]'],
      [1, 'Chicken Curry', 'chicken-curry', 'Tomatensauce, Hähnchen, Ananas, Curry, Oregano', 13.20, null, 'Tomatensauce, Hähnchen, Ananas, Curry, Oregano', 0, 15, '[{"label":"26 cm","price":13.2},{"label":"30 cm","price":15.5},{"label":"Familien Pizza","price":24.5},{"label":"Party 60x40","price":34.5}]'],
      [1, 'Chicken Beef', 'chicken-beef', 'Tomatensauce, Hähnchen, Hackfleisch, Hirtenkäse, Oregano', 14.20, null, 'Tomatensauce, Hähnchen, Hackfleisch, Hirtenkäse, Oregano', 0, 16, '[{"label":"26 cm","price":14.2},{"label":"30 cm","price":16.5},{"label":"Familien Pizza","price":25.5},{"label":"Party 60x40","price":35.9}]'],
      [1, 'BBQ', 'bbq', 'Tomatensauce, Salami, Hackfleisch, BBQ-Sauce, Röstzwiebeln, Oregano', 13.90, null, 'Tomatensauce, Salami, Hackfleisch, BBQ-Sauce, Röstzwiebeln, Oregano', 1, 17, '[{"label":"26 cm","price":13.9},{"label":"30 cm","price":16.2},{"label":"Familien Pizza","price":25.2},{"label":"Party 60x40","price":35.5}]'],
      [1, 'Hot Beef', 'hot-beef', 'Tomatensauce, Hackfleisch, Paprika, Jalapeños, Oregano', 13.60, null, 'Tomatensauce, Hackfleisch, Paprika, Jalapeños, Oregano', 0, 18, '[{"label":"26 cm","price":13.6},{"label":"30 cm","price":15.9},{"label":"Familien Pizza","price":24.9},{"label":"Party 60x40","price":34.9}]'],
      [1, 'Sucuk', 'sucuk', 'Tomatensauce, Sucuk, Peperoni, Ei, Oregano', 13.60, null, 'Tomatensauce, Sucuk, Peperoni, Ei, Oregano', 0, 19, '[{"label":"26 cm","price":13.6},{"label":"30 cm","price":15.9},{"label":"Familien Pizza","price":24.9},{"label":"Party 60x40","price":34.9}]'],
      [1, 'Bacon', 'bacon', 'Tomatensauce, Rinderhackfleisch, BBQ-Sauce, Mozzarella, Bacon, Oregano', 14.20, null, 'Tomatensauce, Rinderhackfleisch, BBQ-Sauce, Mozzarella, Bacon, Oregano', 0, 20, '[{"label":"26 cm","price":14.2},{"label":"30 cm","price":16.5},{"label":"Familien Pizza","price":25.5},{"label":"Party 60x40","price":35.9}]'],
      [1, 'Sucuk Jalapeños', 'sucuk-jalapenos', 'Tomatensauce, Sucuk, Jalapeños, Ei, Oregano', 13.60, null, 'Tomatensauce, Sucuk, Jalapeños, Ei, Oregano', 0, 21, '[{"label":"26 cm","price":13.6},{"label":"30 cm","price":15.9},{"label":"Familien Pizza","price":24.9},{"label":"Party 60x40","price":34.9}]'],
      [1, 'Meat Lovers', 'meat-lovers', 'Tomatensauce, Salami, Schinken, Sucuk, Rinderhackfleisch, Oregano', 14.90, null, 'Tomatensauce, Salami, Schinken, Sucuk, Rinderhackfleisch, Oregano', 1, 22, '[{"label":"26 cm","price":14.9},{"label":"30 cm","price":17.2},{"label":"Familien Pizza","price":26.2},{"label":"Party 60x40","price":36.9}]'],
      [1, 'Hot Dog', 'hot-dog', 'Tomatensauce, Würstchen, Gewürzgurken, Röstzwiebeln, Oregano', 13.20, null, 'Tomatensauce, Würstchen, Gewürzgurken, Röstzwiebeln, Oregano', 0, 23, '[{"label":"26 cm","price":13.2},{"label":"30 cm","price":15.5},{"label":"Familien Pizza","price":24.5},{"label":"Party 60x40","price":34.5}]'],
      [1, 'UFO', 'ufo', 'Tomatensauce, von allem etwas, doppelter Teig, Oregano', 15.20, null, 'Tomatensauce, von allem etwas, doppelter Teig, Oregano', 0, 24, '[{"label":"26 cm","price":15.2},{"label":"30 cm","price":17.5},{"label":"Familien Pizza","price":26.9},{"label":"Party 60x40","price":37.9}]'],
      [1, 'NEXO Wunsch', 'nexo-wunsch', 'Tomatensauce, drei Zutaten nach Wahl, Oregano', 13.60, null, 'Tomatensauce, drei Zutaten nach Wahl, Oregano', 0, 25, '[{"label":"26 cm","price":13.6},{"label":"30 cm","price":15.9},{"label":"Familien Pizza","price":24.9},{"label":"Party 60x40","price":34.9}]'],
      [1, 'NEXO X', 'nexo-x', 'Hollandaise, Krispy Chicken, Mais, Paprika, Knoblauchsauce', 14.20, null, 'Hollandaise, Krispy Chicken, Mais, Paprika, Knoblauchsauce', 0, 26, '[{"label":"26 cm","price":14.2},{"label":"30 cm","price":16.5},{"label":"Familien Pizza","price":25.5},{"label":"Party 60x40","price":35.9}]'],
      [1, 'NEXO Boom', 'nexo-boom', 'Tomatensauce, Salami, Hackfleisch, Paprika, Mais, Hirtenkäse, Oregano', 14.50, null, 'Tomatensauce, Salami, Hackfleisch, Paprika, Mais, Hirtenkäse, Oregano', 1, 27, '[{"label":"26 cm","price":14.5},{"label":"30 cm","price":16.9},{"label":"Familien Pizza","price":25.9},{"label":"Party 60x40","price":36.5}]'],
      [1, 'NEXO Deluxe', 'nexo-deluxe', 'Crème fraîche, Lachs, Paprika, Rucola', 15.20, null, 'Crème fraîche, Lachs, Paprika, Rucola', 0, 28, '[{"label":"26 cm","price":15.2},{"label":"30 cm","price":17.5},{"label":"Familien Pizza","price":26.9},{"label":"Party 60x40","price":37.9}]'],
      [1, 'NEXO Feuer Royale', 'nexo-feuer-royale', 'Tomatensauce, Hackfleisch, Jalapeños, Sauce Hollandaise, Feta, Oregano', 14.50, null, 'Tomatensauce, Hackfleisch, Jalapeños, Sauce Hollandaise, Feta, Oregano', 0, 29, '[{"label":"26 cm","price":14.5},{"label":"30 cm","price":16.9},{"label":"Familien Pizza","price":25.9},{"label":"Party 60x40","price":36.5}]'],
      [1, 'NEXO Goldkrone', 'nexo-goldkrone', 'Tomatensauce, Pute, Brokkoli, Champignons, Sauce Hollandaise, Oregano', 14.20, null, 'Tomatensauce, Pute, Brokkoli, Champignons, Sauce Hollandaise, Oregano', 0, 30, '[{"label":"26 cm","price":14.2},{"label":"30 cm","price":16.5},{"label":"Familien Pizza","price":25.5},{"label":"Party 60x40","price":35.9}]'],
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
      [3, 'NEXO Madame', 'nexo-madame', 'Tomate, Käse', 7.90, null, 'Tomate, Käse', 0, 16],
      [3, 'NEXO Mozzarella', 'nexo-mozzarella', 'Mozzarella, Tomate, Käse', 8.50, null, 'Mozzarella, Tomate, Käse', 1, 17],
      [3, 'NEXO Salami', 'nexo-salami', 'Salami, Käse', 8.90, null, 'Salami, Käse', 0, 18],
      [3, 'NEXO Schinken', 'nexo-schinken', 'Schinken, Käse', 8.90, null, 'Schinken, Käse', 0, 19],
      [3, 'NEXO Chicken', 'nexo-chicken', 'Hähnchen, Käse', 9.50, null, 'Hähnchen, Käse', 0, 20],
      [3, 'NEXO Pute', 'nexo-pute', 'Putenbrust, Käse', 9.50, null, 'Putenbrust, Käse', 0, 21],
      [3, 'NEXO Sucuk', 'nexo-sucuk', 'Sucuk, gekochtes Ei, Käse', 9.50, null, 'Sucuk, gekochtes Ei, Käse', 1, 22],
      [3, 'NEXO Camembert', 'nexo-camembert', 'Camembert, Käse, Preiselbeeren', 9.90, null, 'Camembert, Käse, Preiselbeeren', 0, 23],
      [3, 'NEXO Hawaii', 'nexo-hawaii', 'Schinken, Ananas, Käse', 9.50, null, 'Schinken, Ananas, Käse', 0, 24],
      [3, 'NEXO Crispy', 'nexo-crispy', 'Crispy Chicken, Käse', 10.50, null, 'Crispy Chicken, Käse', 1, 25],
      [3, 'NEXO Tuna', 'nexo-tuna', 'Thunfisch, Zwiebeln, Käse', 9.90, null, 'Thunfisch, Zwiebeln, Käse', 0, 26],
      [3, 'NEXO Beef BBQ', 'nexo-beef-bbq', 'Rindfleisch, Käse, BBQ-Sauce', 10.90, null, 'Rindfleisch, Käse, BBQ-Sauce', 1, 27],
      [3, 'NEXO Formaggi', 'nexo-formaggi', '4 Käsesorten', 10.50, null, '4 Käsesorten', 0, 28],
      [4, 'Gemischter Salat', 'gemischter-salat', 'Eisbergsalat, Tomaten, Gurken, Mais. Dressing nach Wahl.', 7.90, null, 'Eisbergsalat, Tomaten, Gurken, Mais', 0, 1, null],
      [4, 'Chicken Salat', 'chicken-salat', 'Gemischter Salat, gegrillte Hähnchenbrust. Dressing nach Wahl.', 10.90, null, 'Gemischter Salat, gegrillte Hähnchenbrust', 1, 2, null],
      [4, 'Chef Salat', 'chef-salat', 'Gemischter Salat, Schinken, Thunfisch, gekochtes Ei. Dressing nach Wahl.', 11.90, null, 'Gemischter Salat, Schinken, Thunfisch, gekochtes Ei', 1, 3, null],
      [4, 'Cheese Salat', 'cheese-salat', 'Gemischter Salat, 3 verschiedene Käsesorten. Dressing nach Wahl.', 10.90, null, 'Gemischter Salat, 3 verschiedene Käsesorten', 0, 4, null],
      [4, 'Tuna Salat', 'tuna-salat', 'Gemischter Salat, Thunfisch, Zwiebeln, Oliven. Dressing nach Wahl.', 10.50, null, 'Gemischter Salat, Thunfisch, Zwiebeln, Oliven', 0, 5, null],
      [4, 'Wunsch Salat', 'wunsch-salat', 'Gemischter Salat, 3 Zutaten nach Wahl. Dressing nach Wahl.', 11.90, null, 'Gemischter Salat, 3 Zutaten nach Wahl', 0, 6, null],
      [5, 'Spaghetti Bolognese', 'spaghetti-bolognese', 'Spaghetti mit hausgemachter Fleischsoße und Parmesan', 12.90, null, 'Spaghetti, Rinderhack, Tomaten, Parmesan', 1, 12],
      [5, 'Penne Arrabiata', 'penne-arrabiata', 'Penne in scharfer Tomatensoße mit Knoblauch und Chili', 10.90, null, 'Penne, Tomaten, Knoblauch, Chili', 0, 13],
      [6, 'Wiener Schnitzel', 'wiener-schnitzel', 'Kalbfleisch paniert und goldbraun gebraten, mit Preiselbeeren und Zitrone', 16.90, null, 'Kalbfleisch, Panade, Preiselbeeren, Zitrone', 1, 14],
      [6, 'Jägerschnitzel', 'jaegerschnitzel', 'Schweineschnitzel mit cremiger Pilzsoße und Pommes', 15.90, null, 'Schweinefleisch, Pilze, Sahne, Pommes', 0, 15],
      [6, 'Zigeunerschnitzel', 'zigeunerschnitzel', 'Schnitzel mit bunter Paprika-Zwiebel-Soße und Reis', 15.90, null, 'Schweinefleisch, Paprika, Zwiebeln, Reis', 0, 16],
      [7, 'Currywurst mit Pommes', 'currywurst-pommes', 'Mit Pommes', 8.90, null, 'Wurst, Curry, Pommes', 1, 1, null],
      [7, 'Chicken Nuggets', 'chicken-nuggets', '6 oder 12 Stück', 6.90, null, 'Hähnchen, Panade', 1, 2, '[{"label":"6 Stk.","price":6.9},{"label":"12 Stk.","price":10.9}]'],
      [7, 'Chicken Wings', 'chicken-wings', '6 oder 12 Stück', 7.90, null, 'Hähnchen', 0, 3, '[{"label":"6 Stk.","price":7.9},{"label":"12 Stk.","price":12.9}]'],
      [7, 'Chili Cheese Nuggets', 'chili-cheese-nuggets', '6 oder 12 Stück', 6.90, null, 'Hähnchen, Chili, Käse', 0, 4, '[{"label":"6 Stk.","price":6.9},{"label":"12 Stk.","price":10.9}]'],
      [7, 'Baked Feta', 'baked-feta', '6 oder 12 Stück', 7.90, null, 'Feta', 0, 5, '[{"label":"6 Stk.","price":7.9},{"label":"12 Stk.","price":11.9}]'],
      [7, 'Chicken Strips', 'chicken-strips', '6 oder 12 Stück', 8.50, null, 'Hähnchen', 0, 6, '[{"label":"6 Stk.","price":8.5},{"label":"12 Stk.","price":13.9}]'],
      [7, 'Frühlingsrollen', 'fruehlingsrollen', '6 oder 12 Stück', 5.90, null, 'Teig, Gemüse', 0, 7, '[{"label":"6 Stk.","price":5.9},{"label":"12 Stk.","price":9.9}]'],
      [7, 'Mozzarella Sticks', 'mozzarella-sticks', '6 oder 12 Stück', 6.90, null, 'Mozzarella, Panade', 0, 8, '[{"label":"6 Stk.","price":6.9},{"label":"12 Stk.","price":11.9}]'],
      [7, 'Zwiebelringe', 'zwiebelringe', '6 oder 12 Stück', 5.50, null, 'Zwiebeln, Panade', 0, 9, '[{"label":"6 Stk.","price":5.5},{"label":"12 Stk.","price":9.5}]'],
      [7, 'Shrimps', 'shrimps', '6 oder 12 Stück', 8.50, null, 'Shrimps, Panade', 0, 10, '[{"label":"6 Stk.","price":8.5},{"label":"12 Stk.","price":13.9}]'],
      [7, 'Muslitos', 'muslitos', '6 oder 12 Stück', 8.50, null, 'Muslitos, Panade', 0, 11, '[{"label":"6 Stk.","price":8.5},{"label":"12 Stk.","price":13.9}]'],
      [7, 'Corn Dog', 'corn-dog', 'Klein oder Groß', 2.99, null, 'Würstchen, Maisteig', 0, 12, '[{"label":"Klein","price":2.99},{"label":"Groß","price":5.9}]'],
      [8, 'Coca Cola', 'coca-cola', 'Eisgekühlte Coca Cola 0,33l', 3.50, null, null, 0, 20],
      [8, 'Fanta', 'fanta', 'Eisgekühlte Fanta 0,33l', 3.50, null, null, 0, 21],
      [8, 'Wasser', 'wasser', 'Natürliches Mineralwasser mit Kohlensäure 0,75l', 3.00, null, null, 0, 22],
      [9, 'Frühlingsrolle', 'fruehlingsrolle', 'Knusprige Frühlingsrollen mit süß-saurer Dippsauce', 6.90, null, 'Teig, Gemüse, Glasnudeln', 0, 23],
      [9, 'Falafel Wrap', 'falafel-wrap', 'Vegetarischer Wrap mit Falafel, Hummus und frischem Gemüse', 8.90, null, 'Falafel, Hummus, Gemüse, Fladenbrot', 0, 24],
      [10, 'Ketchup', 'ketchup', 'Hausgemachter Ketchup 50ml', 1.50, null, null, 0, 25],
      [10, 'Mayonnaise', 'mayonnaise', 'Hausgemachte Mayonnaise 50ml', 1.50, null, null, 0, 26],
      [10, 'Knoblauchsauce', 'knoblauchsauce', 'Cremige Knoblauchsauce 50ml', 1.50, null, null, 0, 27],
      [10, 'Chillisauce', 'chillisauce', 'Scharfe Chillisauce 50ml', 1.50, null, null, 0, 28],
      [11, 'Spaghetti Eis', 'spaghetti-eis', '', 5.50, null, '', 1, 1, null],
      [11, 'Tiramisu', 'tiramisu', '', 5.50, null, '', 0, 2, null],
      [11, 'Cheesecake', 'cheesecake', '', 5.50, null, '', 0, 3, null],
      [11, 'Oreo Choice', 'oreo-choice', 'Oreo Donut oder Oreo Muffin, 1 nach Wahl', 3.90, null, 'Oreo Donut oder Oreo Muffin, 1 nach Wahl', 0, 4, null],
      [11, 'Nutella Pizza', 'nutella-pizza', 'Nutella, Weiße Schokolade', 8.90, null, 'Nutella, Weiße Schokolade', 1, 5, null],
      [11, 'Crêpe Nutella', 'crepe-nutella', 'Nutella, inklusive 2 Schokoladensorten nach Wahl', 7.90, null, 'Nutella, inklusive 2 Schokoladensorten nach Wahl', 0, 6, null],
      [11, 'Crêpe Frucht', 'crepe-frucht', 'Banane, Erdbeeren oder Kiwi nach Wahl, inklusive 2 Schokoladensorten nach Wahl', 8.90, null, 'Banane, Erdbeeren oder Kiwi nach Wahl, inklusive 2 Schokoladensorten nach Wahl', 0, 7, null],
      [11, 'Crêpe Lotus', 'crepe-lotus', 'Lotus, inklusive 2 Schokoladensorten nach Wahl', 8.90, null, 'Lotus, inklusive 2 Schokoladensorten nach Wahl', 0, 8, null],
      [11, 'Crêpe Oreo', 'crepe-oreo', 'Oreo, inklusive 2 Schokoladensorten nach Wahl', 8.90, null, 'Oreo, inklusive 2 Schokoladensorten nach Wahl', 0, 9, null],
      [11, 'Crêpe Bueno', 'crepe-bueno', 'Bueno, inklusive 2 Schokoladensorten nach Wahl', 9.50, null, 'Bueno, inklusive 2 Schokoladensorten nach Wahl', 1, 10, null],
      [11, 'Mini Pancakes', 'mini-pancakes', '10 oder 20 Stück, 2 Toppings nach Wahl: Nutella, Weiße Schokolade, Pistaziencreme, Puderzucker', 7.90, null, '10 oder 20 Stück, 2 Toppings nach Wahl', 1, 11, '[{"label":"10 Stück","price":7.9},{"label":"20 Stück","price":13.9}]'],
      [11, 'Mini Waffel', 'mini-waffel', '10 oder 20 Stück, 2 Toppings nach Wahl: Nutella, Weiße Schokolade, Pistaziencreme, Puderzucker', 7.90, null, '10 oder 20 Stück, 2 Toppings nach Wahl', 0, 12, '[{"label":"10 Stück","price":7.9},{"label":"20 Stück","price":13.9}]'],
      [12, 'Portion Oliven', 'portion-oliven', '', 4.50, null, '', 0, 1, null],
      [12, 'Portion Peperoni oder Jalapeños', 'portion-peperoni-jalapenos', '', 4.50, null, '', 0, 2, null],
      [12, 'Knoblauchbrot mit Käse', 'knoblauchbrot', '', 6.90, null, '', 1, 3, null],
      [12, 'Spezialbrot', 'spezialbrot', 'mit Käse überbacken', 7.50, null, 'mit Käse überbacken', 0, 4, null],
      [12, 'Formaggi Spezialbrot', 'formaggi-spezialbrot', 'mit verschiedenen Käsesorten', 8.50, null, 'mit verschiedenen Käsesorten', 1, 5, null],
      [13, 'Pommes Frites', 'pommes-frites', 'Groß', 5.50, null, 'Kartoffeln', 1, 1, null],
      [13, 'Chili Cheese Fries', 'chili-cheese-fries', '', 6.90, null, '', 0, 2, null],
      [13, 'Hotdog Fries', 'hotdog-fries', '', 8.50, null, '', 0, 3, null],
      [13, 'Kroketten', 'kroketten', '10 Stück', 5.90, null, 'Kartoffeln', 0, 4, null],
      [13, 'Curly Fries', 'curly-fries', '', 5.90, null, '', 0, 5, null],
      [14, 'BOX 1', 'box-1', '2 Cheeseburger oder 2 Chickenburger, 6 Chicken Nuggets, 6 Chicken Wings, Pommes, 3 Saucen', 38.90, null, '2 Cheeseburger oder 2 Chickenburger, 6 Chicken Nuggets, 6 Chicken Wings, Pommes, 3 Saucen', 1, 1, null],
      [14, 'BOX 2', 'box-2', 'Pizza Wunsch Ø 30 cm, 2 Cheeseburger oder 2 Chickenburger, 6 Snack Rolls nach Wahl, Pommes, 3 Saucen', 49.90, null, 'Pizza Wunsch, Cheeseburger oder Chickenburger, Snack Rolls, Pommes, Saucen', 0, 2, null],
      [14, 'BOX 3', 'box-3', 'Pizza Wunsch Ø 30 cm, 1 Cheeseburger oder 1 Chickenburger, Pasta Wunsch, Pommes, 2 Saucen', 38.90, null, 'Pizza Wunsch, Cheeseburger oder Chickenburger, Pasta Wunsch, Pommes, Saucen', 0, 3, null],
    ];
    for (const p of products) {
      await query(
        `INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, sort_order, sizes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (slug) DO NOTHING`,
        [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9] || null]
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

  // Auto-Migration Croque 2026-09-04: 3 alte Croques löschen, 13 NEXO-Croques per Upsert sicherstellen (idempotent)
  try {
    const croqueCat = await get("SELECT * FROM categories WHERE slug = 'croque'");
    if (croqueCat) {
      await query('UPDATE categories SET description = $1 WHERE id = $2',
        ['Frisch überbackene Croques. Inklusive 1 Sauce nach Wahl.', croqueCat.id]);
      await query("DELETE FROM products WHERE category_id = $1 AND slug IN ('croque-monsieur','croque-madame','croque-hawaii')", [croqueCat.id]);
      const nexoCroques = [
        ['NEXO Madame', 'nexo-madame', 'Tomate, Käse', 7.90, 'Tomate, Käse', 0, 16, '/images/products/img7.jpg'],
        ['NEXO Mozzarella', 'nexo-mozzarella', 'Mozzarella, Tomate, Käse', 8.50, 'Mozzarella, Tomate, Käse', 1, 17, '/images/products/img8.jpg'],
        ['NEXO Salami', 'nexo-salami', 'Salami, Käse', 8.90, 'Salami, Käse', 0, 18, '/images/products/img9.jpg'],
        ['NEXO Schinken', 'nexo-schinken', 'Schinken, Käse', 8.90, 'Schinken, Käse', 0, 19, '/images/products/img7.jpg'],
        ['NEXO Chicken', 'nexo-chicken', 'Hähnchen, Käse', 9.50, 'Hähnchen, Käse', 0, 20, '/images/products/img8.jpg'],
        ['NEXO Pute', 'nexo-pute', 'Putenbrust, Käse', 9.50, 'Putenbrust, Käse', 0, 21, '/images/products/img9.jpg'],
        ['NEXO Sucuk', 'nexo-sucuk', 'Sucuk, gekochtes Ei, Käse', 9.50, 'Sucuk, gekochtes Ei, Käse', 1, 22, '/images/products/img7.jpg'],
        ['NEXO Camembert', 'nexo-camembert', 'Camembert, Käse, Preiselbeeren', 9.90, 'Camembert, Käse, Preiselbeeren', 0, 23, '/images/products/img8.jpg'],
        ['NEXO Hawaii', 'nexo-hawaii', 'Schinken, Ananas, Käse', 9.50, 'Schinken, Ananas, Käse', 0, 24, '/images/products/img9.jpg'],
        ['NEXO Crispy', 'nexo-crispy', 'Crispy Chicken, Käse', 10.50, 'Crispy Chicken, Käse', 1, 25, '/images/products/img7.jpg'],
        ['NEXO Tuna', 'nexo-tuna', 'Thunfisch, Zwiebeln, Käse', 9.90, 'Thunfisch, Zwiebeln, Käse', 0, 26, '/images/products/img8.jpg'],
        ['NEXO Beef BBQ', 'nexo-beef-bbq', 'Rindfleisch, Käse, BBQ-Sauce', 10.90, 'Rindfleisch, Käse, BBQ-Sauce', 1, 27, '/images/products/img9.jpg'],
        ['NEXO Formaggi', 'nexo-formaggi', '4 Käsesorten', 10.50, '4 Käsesorten', 0, 28, '/images/products/img7.jpg'],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image] of nexoCroques) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, image=COALESCE(products.image, EXCLUDED.image)`,
          [croqueCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order]
        );
      }
    }
  } catch (e) {
    console.error('Croque Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration Pizza 2026-09-04: 30 NEXO-Pizzen mit je 4 Größen (26cm/30cm/Familie/Party) per Upsert (idempotent)
  try {
    const pizzaCat = await get("SELECT * FROM categories WHERE slug = 'pizza'");
    if (pizzaCat) {
      await query('UPDATE categories SET description = $1 WHERE id = $2',
        ['Steinofenpizza in 4 Größen: 26 cm, 30 cm, Familien Pizza und Party. Alle Pizzen in 26 cm und 30 cm auch als Calzone erhältlich.', pizzaCat.id]);
      await query("DELETE FROM products WHERE category_id = $1 AND slug IN ('prosciutto')", [pizzaCat.id]);
      const SZ = (a, b, c, d) => JSON.stringify([{ label: '26 cm', price: a }, { label: '30 cm', price: b }, { label: 'Familien Pizza', price: c }, { label: 'Party 60x40', price: d }]);
      const nexoPizzen = [
        ['Margherita', 'margherita', 'Tomatensauce, Oregano', 8.90, 'Tomatensauce, Oregano', 1, 1, '/images/products/img1.jpg', SZ(8.90, 11.50, 19.90, 27.10)],
        ['Mozzarella', 'mozzarella', 'Tomatensauce, Mozzarella, frische Tomaten, Basilikum, Oregano', 10.90, 'Tomatensauce, Mozzarella, frische Tomaten, Basilikum, Oregano', 0, 2, '/images/products/img1.jpg', SZ(10.90, 13.50, 22.90, 31.90)],
        ['Cheese', 'cheese', 'Tomatensauce, verschiedene Käsesorten, Oregano', 10.90, 'Tomatensauce, verschiedene Käsesorten, Oregano', 0, 3, '/images/products/img2.jpg', SZ(10.90, 13.50, 22.90, 31.90)],
        ['Salami', 'salami', 'Tomatensauce, Salami, Oregano', 10.20, 'Tomatensauce, Salami, Oregano', 1, 4, '/images/products/img2.jpg', SZ(10.20, 12.50, 21.50, 30.50)],
        ['Prosciutto', 'prosciutto', 'Tomatensauce, Schinken, Oregano', 10.20, 'Tomatensauce, Schinken, Oregano', 0, 5, '/images/products/img3.jpg', SZ(10.20, 12.50, 21.50, 30.50)],
        ['Funghi', 'funghi', 'Tomatensauce, Champignons, Oregano', 10.20, 'Tomatensauce, Champignons, Oregano', 0, 6, '/images/products/img1.jpg', SZ(10.20, 12.50, 21.50, 30.50)],
        ['Dreiklang', 'dreiklang', 'Tomatensauce, Salami, Schinken, Champignons, Oregano', 12.40, 'Tomatensauce, Salami, Schinken, Champignons, Oregano', 1, 7, '/images/products/img2.jpg', SZ(12.40, 14.90, 23.90, 33.50)],
        ['Hawaii', 'hawaii', 'Tomatensauce, Schinken, Ananas, Oregano', 12.20, 'Tomatensauce, Schinken, Ananas, Oregano', 0, 8, '/images/products/img3.jpg', SZ(12.20, 14.50, 23.50, 33.00)],
        ['Vegetarisch', 'vegetarisch', 'Tomatensauce, verschiedene Gemüsesorten, Oregano', 12.20, 'Tomatensauce, verschiedene Gemüsesorten, Oregano', 0, 9, '/images/products/img1.jpg', SZ(12.20, 14.50, 23.50, 33.00)],
        ['Tonno', 'tonno', 'Tomatensauce, Thunfisch, rote Zwiebeln, Oregano', 12.60, 'Tomatensauce, Thunfisch, rote Zwiebeln, Oregano', 0, 10, '/images/products/img2.jpg', SZ(12.60, 14.90, 24.00, 33.50)],
        ['Scampi', 'scampi', 'Tomatensauce, Scampi, Oregano', 14.20, 'Tomatensauce, Scampi, Oregano', 0, 11, '/images/products/img3.jpg', SZ(14.20, 16.50, 25.50, 35.90)],
        ['Frutti di Mare', 'frutti-di-mare', 'Tomatensauce, Frutti di Mare, Oregano', 14.20, 'Tomatensauce, Frutti di Mare, Oregano', 0, 12, '/images/products/img1.jpg', SZ(14.20, 16.50, 25.50, 35.90)],
        ['Spezial Chicken', 'spezial-chicken', 'Tomatensauce, Hähnchen, Paprika, rote Zwiebeln, Champignons, Oregano', 13.40, 'Tomatensauce, Hähnchen, Paprika, rote Zwiebeln, Champignons, Oregano', 1, 13, '/images/products/img2.jpg', SZ(13.40, 15.90, 24.90, 34.90)],
        ['Chicken Hollandaise', 'chicken-hollandaise', 'Tomatensauce, Hähnchen, Brokkoli, Sauce Hollandaise, Oregano', 13.40, 'Tomatensauce, Hähnchen, Brokkoli, Sauce Hollandaise, Oregano', 0, 14, '/images/products/img3.jpg', SZ(13.40, 15.90, 24.90, 34.90)],
        ['Chicken Curry', 'chicken-curry', 'Tomatensauce, Hähnchen, Ananas, Curry, Oregano', 13.20, 'Tomatensauce, Hähnchen, Ananas, Curry, Oregano', 0, 15, '/images/products/img1.jpg', SZ(13.20, 15.50, 24.50, 34.50)],
        ['Chicken Beef', 'chicken-beef', 'Tomatensauce, Hähnchen, Hackfleisch, Hirtenkäse, Oregano', 14.20, 'Tomatensauce, Hähnchen, Hackfleisch, Hirtenkäse, Oregano', 0, 16, '/images/products/img2.jpg', SZ(14.20, 16.50, 25.50, 35.90)],
        ['BBQ', 'bbq', 'Tomatensauce, Salami, Hackfleisch, BBQ-Sauce, Röstzwiebeln, Oregano', 13.90, 'Tomatensauce, Salami, Hackfleisch, BBQ-Sauce, Röstzwiebeln, Oregano', 1, 17, '/images/products/img3.jpg', SZ(13.90, 16.20, 25.20, 35.50)],
        ['Hot Beef', 'hot-beef', 'Tomatensauce, Hackfleisch, Paprika, Jalapeños, Oregano', 13.60, 'Tomatensauce, Hackfleisch, Paprika, Jalapeños, Oregano', 0, 18, '/images/products/img1.jpg', SZ(13.60, 15.90, 24.90, 34.90)],
        ['Sucuk', 'sucuk', 'Tomatensauce, Sucuk, Peperoni, Ei, Oregano', 13.60, 'Tomatensauce, Sucuk, Peperoni, Ei, Oregano', 0, 19, '/images/products/img2.jpg', SZ(13.60, 15.90, 24.90, 34.90)],
        ['Bacon', 'bacon', 'Tomatensauce, Rinderhackfleisch, BBQ-Sauce, Mozzarella, Bacon, Oregano', 14.20, 'Tomatensauce, Rinderhackfleisch, BBQ-Sauce, Mozzarella, Bacon, Oregano', 0, 20, '/images/products/img3.jpg', SZ(14.20, 16.50, 25.50, 35.90)],
        ['Sucuk Jalapeños', 'sucuk-jalapenos', 'Tomatensauce, Sucuk, Jalapeños, Ei, Oregano', 13.60, 'Tomatensauce, Sucuk, Jalapeños, Ei, Oregano', 0, 21, '/images/products/img1.jpg', SZ(13.60, 15.90, 24.90, 34.90)],
        ['Meat Lovers', 'meat-lovers', 'Tomatensauce, Salami, Schinken, Sucuk, Rinderhackfleisch, Oregano', 14.90, 'Tomatensauce, Salami, Schinken, Sucuk, Rinderhackfleisch, Oregano', 1, 22, '/images/products/img2.jpg', SZ(14.90, 17.20, 26.20, 36.90)],
        ['Hot Dog', 'hot-dog', 'Tomatensauce, Würstchen, Gewürzgurken, Röstzwiebeln, Oregano', 13.20, 'Tomatensauce, Würstchen, Gewürzgurken, Röstzwiebeln, Oregano', 0, 23, '/images/products/img3.jpg', SZ(13.20, 15.50, 24.50, 34.50)],
        ['UFO', 'ufo', 'Tomatensauce, von allem etwas, doppelter Teig, Oregano', 15.20, 'Tomatensauce, von allem etwas, doppelter Teig, Oregano', 0, 24, '/images/products/img1.jpg', SZ(15.20, 17.50, 26.90, 37.90)],
        ['NEXO Wunsch', 'nexo-wunsch', 'Tomatensauce, drei Zutaten nach Wahl, Oregano', 13.60, 'Tomatensauce, drei Zutaten nach Wahl, Oregano', 0, 25, '/images/products/img2.jpg', SZ(13.60, 15.90, 24.90, 34.90)],
        ['NEXO X', 'nexo-x', 'Hollandaise, Krispy Chicken, Mais, Paprika, Knoblauchsauce', 14.20, 'Hollandaise, Krispy Chicken, Mais, Paprika, Knoblauchsauce', 0, 26, '/images/products/img3.jpg', SZ(14.20, 16.50, 25.50, 35.90)],
        ['NEXO Boom', 'nexo-boom', 'Tomatensauce, Salami, Hackfleisch, Paprika, Mais, Hirtenkäse, Oregano', 14.50, 'Tomatensauce, Salami, Hackfleisch, Paprika, Mais, Hirtenkäse, Oregano', 1, 27, '/images/products/img1.jpg', SZ(14.50, 16.90, 25.90, 36.50)],
        ['NEXO Deluxe', 'nexo-deluxe', 'Crème fraîche, Lachs, Paprika, Rucola', 15.20, 'Crème fraîche, Lachs, Paprika, Rucola', 0, 28, '/images/products/img2.jpg', SZ(15.20, 17.50, 26.90, 37.90)],
        ['NEXO Feuer Royale', 'nexo-feuer-royale', 'Tomatensauce, Hackfleisch, Jalapeños, Sauce Hollandaise, Feta, Oregano', 14.50, 'Tomatensauce, Hackfleisch, Jalapeños, Sauce Hollandaise, Feta, Oregano', 0, 29, '/images/products/img3.jpg', SZ(14.50, 16.90, 25.90, 36.50)],
        ['NEXO Goldkrone', 'nexo-goldkrone', 'Tomatensauce, Pute, Brokkoli, Champignons, Sauce Hollandaise, Oregano', 14.20, 'Tomatensauce, Pute, Brokkoli, Champignons, Sauce Hollandaise, Oregano', 0, 30, '/images/products/img1.jpg', SZ(14.20, 16.50, 25.50, 35.90)],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of nexoPizzen) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=EXCLUDED.sizes, image=COALESCE(products.image, EXCLUDED.image)`,
          [pizzaCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('Pizza Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration Dessert 2026-09-04: Kategorie anlegen (falls fehlend) + 12 Produkte per Upsert (idempotent)
  try {
    let dessertCat = await get("SELECT * FROM categories WHERE slug = 'dessert'");
    if (!dessertCat) {
      await query(
        'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING',
        ['Dessert', 'dessert', 'Süße Klassiker, Crêpes, Mini Pancakes & Mini Waffeln. Alle Crêpes inklusive 2 Schokoladensorten nach Wahl.', 11]
      );
      dessertCat = await get("SELECT * FROM categories WHERE slug = 'dessert'");
    }
    if (dessertCat) {
      await query('UPDATE categories SET description = $1, sort_order = 11 WHERE id = $2',
        ['Süße Klassiker, Crêpes, Mini Pancakes & Mini Waffeln. Alle Crêpes inklusive 2 Schokoladensorten nach Wahl.', dessertCat.id]);
      const desserts = [
        ['Spaghetti Eis', 'spaghetti-eis', '', 5.50, '', 1, 1, '/images/products/img20.jpg', null],
        ['Tiramisu', 'tiramisu', '', 5.50, '', 0, 2, '/images/products/img19.jpg', null],
        ['Cheesecake', 'cheesecake', '', 5.50, '', 0, 3, '/images/products/img22.jpg', null],
        ['Oreo Choice', 'oreo-choice', 'Oreo Donut oder Oreo Muffin, 1 nach Wahl', 3.90, 'Oreo Donut oder Oreo Muffin, 1 nach Wahl', 0, 4, '/images/products/img21.jpg', null],
        ['Nutella Pizza', 'nutella-pizza', 'Nutella, Weiße Schokolade', 8.90, 'Nutella, Weiße Schokolade', 1, 5, '/images/products/img19.jpg', null],
        ['Crêpe Nutella', 'crepe-nutella', 'Nutella, inklusive 2 Schokoladensorten nach Wahl', 7.90, 'Nutella, inklusive 2 Schokoladensorten nach Wahl', 0, 6, '/images/products/img20.jpg', null],
        ['Crêpe Frucht', 'crepe-frucht', 'Banane, Erdbeeren oder Kiwi nach Wahl, inklusive 2 Schokoladensorten nach Wahl', 8.90, 'Banane, Erdbeeren oder Kiwi nach Wahl, inklusive 2 Schokoladensorten nach Wahl', 0, 7, '/images/products/img21.jpg', null],
        ['Crêpe Lotus', 'crepe-lotus', 'Lotus, inklusive 2 Schokoladensorten nach Wahl', 8.90, 'Lotus, inklusive 2 Schokoladensorten nach Wahl', 0, 8, '/images/products/img22.jpg', null],
        ['Crêpe Oreo', 'crepe-oreo', 'Oreo, inklusive 2 Schokoladensorten nach Wahl', 8.90, 'Oreo, inklusive 2 Schokoladensorten nach Wahl', 0, 9, '/images/products/img19.jpg', null],
        ['Crêpe Bueno', 'crepe-bueno', 'Bueno, inklusive 2 Schokoladensorten nach Wahl', 9.50, 'Bueno, inklusive 2 Schokoladensorten nach Wahl', 1, 10, '/images/products/img20.jpg', null],
        ['Mini Pancakes', 'mini-pancakes', '10 oder 20 Stück, 2 Toppings nach Wahl: Nutella, Weiße Schokolade, Pistaziencreme, Puderzucker', 7.90, '10 oder 20 Stück, 2 Toppings nach Wahl', 1, 11, '/images/products/img21.jpg', '[{"label":"10 Stück","price":7.9},{"label":"20 Stück","price":13.9}]'],
        ['Mini Waffel', 'mini-waffel', '10 oder 20 Stück, 2 Toppings nach Wahl: Nutella, Weiße Schokolade, Pistaziencreme, Puderzucker', 7.90, '10 oder 20 Stück, 2 Toppings nach Wahl', 0, 12, '/images/products/img22.jpg', '[{"label":"10 Stück","price":7.9},{"label":"20 Stück","price":13.9}]'],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of desserts) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=COALESCE(EXCLUDED.sizes, products.sizes), image=COALESCE(products.image, EXCLUDED.image)`,
          [dessertCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('Dessert Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration Beilagen 2026-09-04: Kategorie anlegen (falls fehlend) + 5 Produkte per Upsert (idempotent)
  try {
    let beilagenCat = await get("SELECT * FROM categories WHERE slug = 'beilagen'");
    if (!beilagenCat) {
      await query(
        'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING',
        ['Beilagen', 'beilagen', 'Knusprige Beilagen für jeden Geschmack.', 12]
      );
      beilagenCat = await get("SELECT * FROM categories WHERE slug = 'beilagen'");
    }
    if (beilagenCat) {
      await query('UPDATE categories SET description = $1, sort_order = 12 WHERE id = $2',
        ['Knusprige Beilagen für jeden Geschmack.', beilagenCat.id]);
      const beilagen = [
        ['Portion Oliven', 'portion-oliven', '', 4.50, '', 0, 1, '/images/products/img4.jpg', null],
        ['Portion Peperoni oder Jalapeños', 'portion-peperoni-jalapenos', '', 4.50, '', 0, 2, '/images/products/img5.jpg', null],
        ['Knoblauchbrot mit Käse', 'knoblauchbrot', '', 6.90, '', 1, 3, '/images/products/img7.jpg', null],
        ['Spezialbrot', 'spezialbrot', 'mit Käse überbacken', 7.50, 'mit Käse überbacken', 0, 4, '/images/products/img8.jpg', null],
        ['Formaggi Spezialbrot', 'formaggi-spezialbrot', 'mit verschiedenen Käsesorten', 8.50, 'mit verschiedenen Käsesorten', 1, 5, '/images/products/img9.jpg', null],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of beilagen) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=COALESCE(EXCLUDED.sizes, products.sizes), image=COALESCE(products.image, EXCLUDED.image)`,
          [beilagenCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('Beilagen Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration Fries 2026-09-04: Kategorie anlegen (falls fehlend) + 5 Produkte per Upsert (idempotent)
  try {
    let friesCat = await get("SELECT * FROM categories WHERE slug = 'fries'");
    if (!friesCat) {
      await query(
        'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING',
        ['Fries', 'fries', 'Knusprige Fries für jeden Geschmack.', 13]
      );
      friesCat = await get("SELECT * FROM categories WHERE slug = 'fries'");
    }
    if (friesCat) {
      await query('UPDATE categories SET description = $1, sort_order = 13 WHERE id = $2',
        ['Knusprige Fries für jeden Geschmack.', friesCat.id]);
      const fries = [
        ['Pommes Frites', 'pommes-frites', 'Groß', 5.50, 'Kartoffeln', 1, 1, '/images/products/img7.jpg', null],
        ['Chili Cheese Fries', 'chili-cheese-fries', '', 6.90, '', 0, 2, '/images/products/img8.jpg', null],
        ['Hotdog Fries', 'hotdog-fries', '', 8.50, '', 0, 3, '/images/products/img9.jpg', null],
        ['Kroketten', 'kroketten', '10 Stück', 5.90, 'Kartoffeln', 0, 4, '/images/products/img7.jpg', null],
        ['Curly Fries', 'curly-fries', '', 5.90, '', 0, 5, '/images/products/img8.jpg', null],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of fries) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=COALESCE(EXCLUDED.sizes, products.sizes), image=COALESCE(products.image, EXCLUDED.image)`,
          [friesCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('Fries Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration NEXO Box 2026-09-04: Kategorie anlegen (falls fehlend) + 3 Boxen per Upsert (idempotent)
  try {
    let boxCat = await get("SELECT * FROM categories WHERE slug = 'nexo-box'");
    if (!boxCat) {
      await query(
        'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING',
        ['NEXO Box', 'nexo-box', 'Gemeinsam genießen & sparen.', 14]
      );
      boxCat = await get("SELECT * FROM categories WHERE slug = 'nexo-box'");
    }
    if (boxCat) {
      await query('UPDATE categories SET description = $1, sort_order = 14 WHERE id = $2',
        ['Gemeinsam genießen & sparen.', boxCat.id]);
      const boxen = [
        ['BOX 1', 'box-1', '2 Cheeseburger oder 2 Chickenburger, 6 Chicken Nuggets, 6 Chicken Wings, Pommes, 3 Saucen', 38.90, '2 Cheeseburger oder 2 Chickenburger, 6 Chicken Nuggets, 6 Chicken Wings, Pommes, 3 Saucen', 1, 1, '/images/products/img16.jpg', null],
        ['BOX 2', 'box-2', 'Pizza Wunsch Ø 30 cm, 2 Cheeseburger oder 2 Chickenburger, 6 Snack Rolls nach Wahl, Pommes, 3 Saucen', 49.90, 'Pizza Wunsch, Cheeseburger oder Chickenburger, Snack Rolls, Pommes, Saucen', 0, 2, '/images/products/img17.jpg', null],
        ['BOX 3', 'box-3', 'Pizza Wunsch Ø 30 cm, 1 Cheeseburger oder 1 Chickenburger, Pasta Wunsch, Pommes, 2 Saucen', 38.90, 'Pizza Wunsch, Cheeseburger oder Chickenburger, Pasta Wunsch, Pommes, Saucen', 0, 3, '/images/products/img18.jpg', null],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of boxen) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=COALESCE(EXCLUDED.sizes, products.sizes), image=COALESCE(products.image, EXCLUDED.image)`,
          [boxCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('NEXO Box Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration Salat 2026-09-04: 2 alte Salate löschen, 6 neue per Upsert (idempotent)
  try {
    const salatCat = await get("SELECT * FROM categories WHERE slug = 'salat'");
    if (salatCat) {
      await query('UPDATE categories SET description = $1 WHERE id = $2',
        ['Frische Salate mit Dressing nach Wahl: Knoblauch, Hausdressing, Yoghurt, American, Kräuter.', salatCat.id]);
      await query("DELETE FROM products WHERE category_id = $1 AND slug IN ('griechischer-salat','caesar-salat')", [salatCat.id]);
      const salate = [
        ['Gemischter Salat', 'gemischter-salat', 'Eisbergsalat, Tomaten, Gurken, Mais. Dressing nach Wahl.', 7.90, 'Eisbergsalat, Tomaten, Gurken, Mais', 0, 1, '/images/products/img4.jpg', null],
        ['Chicken Salat', 'chicken-salat', 'Gemischter Salat, gegrillte Hähnchenbrust. Dressing nach Wahl.', 10.90, 'Gemischter Salat, gegrillte Hähnchenbrust', 1, 2, '/images/products/img5.jpg', null],
        ['Chef Salat', 'chef-salat', 'Gemischter Salat, Schinken, Thunfisch, gekochtes Ei. Dressing nach Wahl.', 11.90, 'Gemischter Salat, Schinken, Thunfisch, gekochtes Ei', 1, 3, '/images/products/img4.jpg', null],
        ['Cheese Salat', 'cheese-salat', 'Gemischter Salat, 3 verschiedene Käsesorten. Dressing nach Wahl.', 10.90, 'Gemischter Salat, 3 verschiedene Käsesorten', 0, 4, '/images/products/img5.jpg', null],
        ['Tuna Salat', 'tuna-salat', 'Gemischter Salat, Thunfisch, Zwiebeln, Oliven. Dressing nach Wahl.', 10.50, 'Gemischter Salat, Thunfisch, Zwiebeln, Oliven', 0, 5, '/images/products/img4.jpg', null],
        ['Wunsch Salat', 'wunsch-salat', 'Gemischter Salat, 3 Zutaten nach Wahl. Dressing nach Wahl.', 11.90, 'Gemischter Salat, 3 Zutaten nach Wahl', 0, 6, '/images/products/img5.jpg', null],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of salate) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=COALESCE(EXCLUDED.sizes, products.sizes), image=COALESCE(products.image, EXCLUDED.image)`,
          [salatCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('Salat Auto-Migration übersprungen:', e.message);
  }

  // Auto-Migration Snacks 2026-09-04: alte Snacks löschen, 12 neue per Upsert (idempotent)
  try {
    const snacksCat = await get("SELECT * FROM categories WHERE slug = 'snacks'");
    if (snacksCat) {
      await query('UPDATE categories SET description = $1 WHERE id = $2',
        ['Menü-Aufpreis +4,00 €: mit Pommes und 0,33 l Softdrink nach Wahl.', snacksCat.id]);
      await query("DELETE FROM products WHERE category_id = $1 AND slug IN ('pommes-frites','nachos')", [snacksCat.id]);
      const S6 = (a, b) => JSON.stringify([{ label: '6 Stk.', price: a }, { label: '12 Stk.', price: b }]);
      const snacks = [
        ['Currywurst mit Pommes', 'currywurst-pommes', 'Mit Pommes', 8.90, 'Wurst, Curry, Pommes', 1, 1, '/images/products/img7.jpg', null],
        ['Chicken Nuggets', 'chicken-nuggets', '6 oder 12 Stück', 6.90, 'Hähnchen, Panade', 1, 2, '/images/products/img8.jpg', S6(6.90, 10.90)],
        ['Chicken Wings', 'chicken-wings', '6 oder 12 Stück', 7.90, 'Hähnchen', 0, 3, '/images/products/img9.jpg', S6(7.90, 12.90)],
        ['Chili Cheese Nuggets', 'chili-cheese-nuggets', '6 oder 12 Stück', 6.90, 'Hähnchen, Chili, Käse', 0, 4, '/images/products/img7.jpg', S6(6.90, 10.90)],
        ['Baked Feta', 'baked-feta', '6 oder 12 Stück', 7.90, 'Feta', 0, 5, '/images/products/img8.jpg', S6(7.90, 11.90)],
        ['Chicken Strips', 'chicken-strips', '6 oder 12 Stück', 8.50, 'Hähnchen', 0, 6, '/images/products/img9.jpg', S6(8.50, 13.90)],
        ['Frühlingsrollen', 'fruehlingsrollen', '6 oder 12 Stück', 5.90, 'Teig, Gemüse', 0, 7, '/images/products/img7.jpg', S6(5.90, 9.90)],
        ['Mozzarella Sticks', 'mozzarella-sticks', '6 oder 12 Stück', 6.90, 'Mozzarella, Panade', 0, 8, '/images/products/img8.jpg', S6(6.90, 11.90)],
        ['Zwiebelringe', 'zwiebelringe', '6 oder 12 Stück', 5.50, 'Zwiebeln, Panade', 0, 9, '/images/products/img9.jpg', S6(5.50, 9.50)],
        ['Shrimps', 'shrimps', '6 oder 12 Stück', 8.50, 'Shrimps, Panade', 0, 10, '/images/products/img7.jpg', S6(8.50, 13.90)],
        ['Muslitos', 'muslitos', '6 oder 12 Stück', 8.50, 'Muslitos, Panade', 0, 11, '/images/products/img8.jpg', S6(8.50, 13.90)],
        ['Corn Dog', 'corn-dog', 'Klein oder Groß', 2.99, 'Würstchen, Maisteig', 0, 12, '/images/products/img9.jpg', JSON.stringify([{ label: 'Klein', price: 2.99 }, { label: 'Groß', price: 5.90 }])],
      ];
      for (const [name, slug, description, price, ingredients, is_featured, sort_order, image, sizes] of snacks) {
        await query(
          `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order, sizes)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9,$10)
           ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order, sizes=EXCLUDED.sizes, image=COALESCE(products.image, EXCLUDED.image)`,
          [snacksCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order, sizes]
        );
      }
    }
  } catch (e) {
    console.error('Snacks Auto-Migration übersprungen:', e.message);
  }

  // Telefon auf echte Nummer umstellen (nur wenn noch der alte Platzhalter drinsteht)
  try {
    await query("UPDATE settings SET value = '04131 4006817' WHERE key = 'phone' AND value = '+49 30 123456789'");
  } catch (e) {
    console.error('Phone-Migration übersprungen:', e.message);
  }

  // Logo aktivieren (nur wenn noch keins gesetzt ist)
  try {
    await query("UPDATE settings SET value = '/images/nexo-logo.png' WHERE key = 'logo_url' AND (value = '' OR value IS NULL)");
  } catch (e) {
    console.error('Logo-Migration übersprungen:', e.message);
  }

  const defaultSettings = [
    ['site_name', 'Ammaya'],
    ['site_description', 'Ihr Restaurant für Pizza, Burger und mehr'],
    ['address', 'Musterstraße 42, 10117 Berlin'],
    ['phone', '04131 4006817'],
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
    ['logo_url', '/images/nexo-logo.png'],
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
