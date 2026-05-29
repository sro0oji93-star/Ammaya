const { db, initDatabase } = require('./db');

async function run() {
  await initDatabase();

  console.log('Starting menu update...');

  await db.prepare('DELETE FROM products').run();
  console.log('Deleted all existing products');

  await db.prepare('DELETE FROM categories').run();
  console.log('Deleted all existing categories');

  const insertCat = db.prepare("INSERT INTO categories (name, slug, description, image, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)");

  const categories = [
    { name: 'Pommes & Snacks', slug: 'pommes-snacks', description: 'Knusprige Pommes und leckere Snacks', image: '/images/ChatGPT Image 28 Mayıs 2026, 08_48_40 स.png', sort: 1 },
    { name: 'Snack Rolls', slug: 'snack-rolls', description: 'Frische Wrap-Rolls in verschiedenen Sorten', image: '/images/ChatGPT Image 28 Mayıs 2026, 08_44_25 स.png', sort: 2 },
    { name: 'Croque', slug: 'croque', description: 'Knusprige Croque-Sandwiches', image: '/images/ChatGPT Image 28 Mayıs 2026, 08_35_02 स.png', sort: 3 },
    { name: 'Chicken & Fingerfood', slug: 'chicken-fingerfood', description: 'Knuspriges Hähnchen und Fingerfood', image: '/images/ChatGPT Image 25 Mayıs 2026, 11_43_05 م.png', sort: 4 },
    { name: 'Burger', slug: 'burger', description: 'Saftige Burger in verschiedenen Sorten', image: '/images/ChatGPT Image 25 Mayıs 2026, 11_12_08 م.png', sort: 5 },
    { name: 'Pasta', slug: 'pasta', description: 'Italienische Pasta-Klassiker', image: '/images/ChatGPT Image 25 Mayıs 2026, 11_07_08 م.png', sort: 6 },
    { name: 'Salate', slug: 'salate', description: 'Frische und kreative Salatkreationen', image: '/images/ChatGPT Image 28 Mayıs 2026, 10_08_59 स.png', sort: 7 },
  ];

  const catIds = {};
  for (const cat of categories) {
    const result = await insertCat.run(cat.name, cat.slug, cat.description, cat.image, cat.sort);
    catIds[cat.slug] = result.lastInsertRowid;
  }
  console.log('Inserted new categories');

  const insertProd = db.prepare("INSERT INTO products (category_id, name, slug, description, price, old_price, ingredients, is_featured, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)");

  const products = [
    { cat: 'pommes-snacks', name: 'Chili Cheese Pommes', slug: 'chili-cheese-pommes', desc: 'Pommes, Käse, Chili-Sauce', price: 5.00, old: null, ingredients: 'Pommes, Käse, Chili-Sauce', featured: 0, sort: 1 },
    { cat: 'pommes-snacks', name: 'Pommes', slug: 'pommes', desc: 'Kartoffeln, Salz, Öl', price: 3.00, old: null, ingredients: 'Kartoffeln, Salz, Öl', featured: 0, sort: 2 },
    { cat: 'pommes-snacks', name: 'Country Fries', slug: 'country-fries', desc: 'Kartoffeln mit Schale, Salz, Öl', price: 4.00, old: null, ingredients: 'Kartoffeln mit Schale, Salz, Öl', featured: 0, sort: 3 },
    { cat: 'pommes-snacks', name: 'Twister', slug: 'twister', desc: 'Spiralförmige Kartoffelstäbchen, Salz, Öl', price: 4.00, old: null, ingredients: 'Spiralförmige Kartoffelstäbchen, Salz, Öl', featured: 0, sort: 4 },
    { cat: 'pommes-snacks', name: 'Chili Pommes', slug: 'chili-pommes', desc: 'Pommes, Chili-Sauce, Zwiebeln', price: 5.00, old: null, ingredients: 'Pommes, Chili-Sauce, Zwiebeln', featured: 0, sort: 5 },
    { cat: 'pommes-snacks', name: 'Kroketten', slug: 'kroketten', desc: 'Kartoffel-Kroketten, frittiert', price: 5.00, old: null, ingredients: 'Kartoffel-Kroketten, frittiert', featured: 0, sort: 6 },
    { cat: 'pommes-snacks', name: 'BBQ Pommes', slug: 'bbq-pommes', desc: 'Pommes, BBQ-Sauce', price: 5.00, old: null, ingredients: 'Pommes, BBQ-Sauce', featured: 0, sort: 7 },
    { cat: 'pommes-snacks', name: 'BBQ Twister', slug: 'bbq-twister', desc: 'Twister, BBQ-Sauce', price: 5.00, old: null, ingredients: 'Twister, BBQ-Sauce', featured: 0, sort: 8 },
    { cat: 'pommes-snacks', name: 'Chili Twister', slug: 'chili-twister', desc: 'Twister, Chili-Sauce', price: 5.00, old: null, ingredients: 'Twister, Chili-Sauce', featured: 0, sort: 9 },
    { cat: 'snack-rolls', name: 'Salami Roll (6 Stk.)', slug: 'salami-roll-6', desc: 'Salami, Tortilla', price: 6.00, old: null, ingredients: 'Salami, Tortilla', featured: 0, sort: 1 },
    { cat: 'snack-rolls', name: 'Salami Roll (12 Stk.)', slug: 'salami-roll-12', desc: 'Salami, Tortilla', price: 10.50, old: null, ingredients: 'Salami, Tortilla', featured: 0, sort: 2 },
    { cat: 'snack-rolls', name: 'Schinken Roll (6 Stk.)', slug: 'schinken-roll-6', desc: 'Schinken, Tortilla', price: 6.00, old: null, ingredients: 'Schinken, Tortilla', featured: 0, sort: 3 },
    { cat: 'snack-rolls', name: 'Schinken Roll (12 Stk.)', slug: 'schinken-roll-12', desc: 'Schinken, Tortilla', price: 10.50, old: null, ingredients: 'Schinken, Tortilla', featured: 0, sort: 4 },
    { cat: 'snack-rolls', name: 'Thunfisch Roll (6 Stk.)', slug: 'thunfisch-roll-6', desc: 'Thunfisch, Tortilla', price: 6.50, old: null, ingredients: 'Thunfisch, Tortilla', featured: 0, sort: 5 },
    { cat: 'snack-rolls', name: 'Thunfisch Roll (12 Stk.)', slug: 'thunfisch-roll-12', desc: 'Thunfisch, Tortilla', price: 11.00, old: null, ingredients: 'Thunfisch, Tortilla', featured: 0, sort: 6 },
    { cat: 'snack-rolls', name: 'Hähnchen Roll (6 Stk.)', slug: 'haehnchen-roll-6', desc: 'Hähnchenbrust, Tortilla', price: 6.00, old: null, ingredients: 'Hähnchenbrust, Tortilla', featured: 0, sort: 7 },
    { cat: 'snack-rolls', name: 'Hähnchen Roll (12 Stk.)', slug: 'haehnchen-roll-12', desc: 'Hähnchenbrust, Tortilla', price: 10.50, old: null, ingredients: 'Hähnchenbrust, Tortilla', featured: 0, sort: 8 },
    { cat: 'snack-rolls', name: 'Puter Roll (6 Stk.)', slug: 'puter-roll-6', desc: 'Putenfleisch, Tortilla', price: 6.00, old: null, ingredients: 'Putenfleisch, Tortilla', featured: 0, sort: 9 },
    { cat: 'snack-rolls', name: 'Puter Roll (12 Stk.)', slug: 'puter-roll-12', desc: 'Putenfleisch, Tortilla', price: 10.50, old: null, ingredients: 'Putenfleisch, Tortilla', featured: 0, sort: 10 },
    { cat: 'snack-rolls', name: 'Hot Chicken Roll (6 Stk.)', slug: 'hot-chicken-roll-6', desc: 'Hähnchenbrust, Chili, Tortilla', price: 6.50, old: null, ingredients: 'Hähnchenbrust, Chili, Tortilla', featured: 0, sort: 11 },
    { cat: 'snack-rolls', name: 'Hot Chicken Roll (12 Stk.)', slug: 'hot-chicken-roll-12', desc: 'Hähnchenbrust, Chili, Tortilla', price: 11.00, old: null, ingredients: 'Hähnchenbrust, Chili, Tortilla', featured: 0, sort: 12 },
    { cat: 'snack-rolls', name: 'Hawaii Roll', slug: 'hawaii-roll', desc: 'Hähnchen, Ananas, Tortilla', price: 6.00, old: null, ingredients: 'Hähnchen, Ananas, Tortilla', featured: 0, sort: 13 },
    { cat: 'snack-rolls', name: 'Überraschung Roll', slug: 'ueberraschung-roll', desc: 'Überraschungsmischung, Tortilla', price: 19.00, old: null, ingredients: 'Überraschungsmischung, Tortilla', featured: 0, sort: 14 },
    { cat: 'snack-rolls', name: 'Feuerring Roll', slug: 'feuerring-roll', desc: 'Rindfleisch, Chili, scharfe Sauce, Tortilla', price: 6.80, old: null, ingredients: 'Rindfleisch, Chili, scharfe Sauce, Tortilla', featured: 0, sort: 15 },
    { cat: 'snack-rolls', name: 'Käse Ring+dip', slug: 'kaese-ring-dip', desc: 'Käse, Dip-Sauce, Tortilla', price: 6.00, old: null, ingredients: 'Käse, Dip-Sauce, Tortilla', featured: 0, sort: 16 },
    { cat: 'croque', name: 'Croque Madame', slug: 'croque-madame', desc: 'Schinken, Käse, Ei, Brot', price: 7.50, old: null, ingredients: 'Schinken, Käse, Ei, Brot', featured: 0, sort: 1 },
    { cat: 'croque', name: 'Croque Camembert', slug: 'croque-camembert', desc: 'Camembert, Schinken, Brot', price: 8.50, old: null, ingredients: 'Camembert, Schinken, Brot', featured: 0, sort: 2 },
    { cat: 'croque', name: 'Croque Schinken', slug: 'croque-schinken', desc: 'Schinken, Käse, Brot, Tomaten', price: 9.00, old: null, ingredients: 'Schinken, Käse, Brot, Tomaten', featured: 0, sort: 3 },
    { cat: 'croque', name: 'Croque Salami Champignons', slug: 'croque-salami-champignons', desc: 'Salami, Pilze, Käse, Brot', price: 9.00, old: null, ingredients: 'Salami, Pilze, Käse, Brot', featured: 0, sort: 4 },
    { cat: 'croque', name: 'Croque Salami', slug: 'croque-salami', desc: 'Salami, Käse, Brot, Tomaten', price: 9.00, old: null, ingredients: 'Salami, Käse, Brot, Tomaten', featured: 0, sort: 5 },
    { cat: 'croque', name: 'Croque Hawaii', slug: 'croque-hawaii', desc: 'Schinken, Ananas, Käse, Brot', price: 8.50, old: null, ingredients: 'Schinken, Ananas, Käse, Brot', featured: 0, sort: 6 },
    { cat: 'croque', name: 'Croque Thunfisch', slug: 'croque-thunfisch', desc: 'Thunfisch, Käse, Zwiebeln, Brot', price: 10.00, old: null, ingredients: 'Thunfisch, Käse, Zwiebeln, Brot', featured: 0, sort: 7 },
    { cat: 'croque', name: 'Croque Hähnchenbrust', slug: 'croque-haehnchenbrust', desc: 'Hähnchenbrust, Käse, Brot, Tomaten', price: 9.00, old: null, ingredients: 'Hähnchenbrust, Käse, Brot, Tomaten', featured: 0, sort: 8 },
    { cat: 'croque', name: 'Croque Sucuk', slug: 'croque-sucuk', desc: 'Sucuk, Käse, Zwiebeln, Brot', price: 8.50, old: null, ingredients: 'Sucuk, Käse, Zwiebeln, Brot', featured: 0, sort: 9 },
    { cat: 'chicken-fingerfood', name: 'Chicken Nuggets (6 Stk.)', slug: 'chicken-nuggets-6', desc: 'Knusprige Hähnchen-Nuggets', price: 6.50, old: null, ingredients: 'Hähnchen-Nuggets', featured: 0, sort: 1 },
    { cat: 'chicken-fingerfood', name: 'Chicken Nuggets (12 Stk.)', slug: 'chicken-nuggets-12', desc: 'Knusprige Hähnchen-Nuggets', price: 8.50, old: null, ingredients: 'Hähnchen-Nuggets', featured: 0, sort: 2 },
    { cat: 'chicken-fingerfood', name: 'Chicken Wings (6 Stk.)', slug: 'chicken-wings-6', desc: 'Würzige Hähnchen-Flügel', price: 7.00, old: null, ingredients: 'Hähnchen-Flügel', featured: 0, sort: 3 },
    { cat: 'chicken-fingerfood', name: 'Chicken Wings (12 Stk.)', slug: 'chicken-wings-12', desc: 'Würzige Hähnchen-Flügel', price: 10.00, old: null, ingredients: 'Hähnchen-Flügel', featured: 0, sort: 4 },
    { cat: 'chicken-fingerfood', name: 'Crispy Chicken Fingers (6 Stk.)', slug: 'crispy-chicken-fingers-6', desc: 'Knusprige Hähnchen-Finger', price: 7.50, old: null, ingredients: 'Hähnchen-Finger', featured: 0, sort: 5 },
    { cat: 'chicken-fingerfood', name: 'Crispy Chicken Fingers (12 Stk.)', slug: 'crispy-chicken-fingers-12', desc: 'Knusprige Hähnchen-Finger', price: 10.00, old: null, ingredients: 'Hähnchen-Finger', featured: 0, sort: 6 },
    { cat: 'chicken-fingerfood', name: 'Chili Cheese Nuggets (6 Stk.)', slug: 'chili-cheese-nuggets-6', desc: 'Hähnchen-Nuggets mit Chili und Käse', price: 6.50, old: null, ingredients: 'Hähnchen-Nuggets, Chili, Käse', featured: 0, sort: 7 },
    { cat: 'chicken-fingerfood', name: 'Chili Cheese Nuggets (12 Stk.)', slug: 'chili-cheese-nuggets-12', desc: 'Hähnchen-Nuggets mit Chili und Käse', price: 8.50, old: null, ingredients: 'Hähnchen-Nuggets, Chili, Käse', featured: 0, sort: 8 },
    { cat: 'chicken-fingerfood', name: 'Mozzarella Sticks (6 Stk.)', slug: 'mozzarella-sticks-6', desc: 'Frittierte Mozzarella-Stäbchen', price: 6.50, old: null, ingredients: 'Mozzarella', featured: 0, sort: 9 },
    { cat: 'chicken-fingerfood', name: 'Mozzarella Sticks (12 Stk.)', slug: 'mozzarella-sticks-12', desc: 'Frittierte Mozzarella-Stäbchen', price: 8.50, old: null, ingredients: 'Mozzarella', featured: 0, sort: 10 },
    { cat: 'chicken-fingerfood', name: 'Mix-Box', slug: 'mix-box', desc: 'Große Fingerfood Mischbox', price: 17.50, old: null, ingredients: 'Fingerfood Mischbox', featured: 1, sort: 11 },
    { cat: 'chicken-fingerfood', name: 'Curry Wurst', slug: 'curry-wurst', desc: 'Würstchen mit Curry-Sauce', price: 7.90, old: null, ingredients: 'Würstchen, Curry-Sauce', featured: 0, sort: 12 },
    { cat: 'burger', name: 'Hamburger', slug: 'hamburger', desc: 'Rindfleisch, Brötchen, Salat, Tomate', price: 6.50, old: null, ingredients: 'Rindfleisch, Brötchen, Salat, Tomate', featured: 0, sort: 1 },
    { cat: 'burger', name: 'Cheeseburger', slug: 'cheeseburger', desc: 'Rindfleisch, Käse, Brötchen, Salat, Tomate', price: 7.00, old: null, ingredients: 'Rindfleisch, Käse, Brötchen, Salat, Tomate', featured: 0, sort: 2 },
    { cat: 'burger', name: 'Chicken Burger', slug: 'chicken-burger', desc: 'Hähnchenbrust, Brötchen, Salat, Tomate', price: 7.50, old: null, ingredients: 'Hähnchenbrust, Brötchen, Salat, Tomate', featured: 0, sort: 3 },
    { cat: 'burger', name: 'Bacon Burger', slug: 'bacon-burger', desc: 'Rindfleisch, Speck, Brötchen, Salat, Tomate', price: 8.00, old: null, ingredients: 'Rindfleisch, Speck, Brötchen, Salat, Tomate', featured: 0, sort: 4 },
    { cat: 'burger', name: 'Champignon Burger', slug: 'champignon-burger', desc: 'Rindfleisch, Pilze, Brötchen, Salat, Tomate', price: 7.50, old: null, ingredients: 'Rindfleisch, Pilze, Brötchen, Salat, Tomate', featured: 0, sort: 5 },
    { cat: 'burger', name: 'Crispy Chicken Burger', slug: 'crispy-chicken-burger', desc: 'Hähnchen knusprig, Brötchen, Salat, Tomate', price: 8.00, old: null, ingredients: 'Hähnchen, Brötchen, Salat, Tomate', featured: 0, sort: 6 },
    { cat: 'burger', name: 'Italian Burger', slug: 'italian-burger', desc: 'Rindfleisch, Mozzarella, Basilikum, Brötchen', price: 7.50, old: null, ingredients: 'Rindfleisch, Mozzarella, Basilikum, Brötchen', featured: 0, sort: 7 },
    { cat: 'burger', name: 'Jumbo Cheeseburger', slug: 'jumbo-cheeseburger', desc: 'Doppeltes Rindfleisch, Käse, Brötchen, Salat, Tomate', price: 9.50, old: null, ingredients: 'Rindfleisch, Käse, Brötchen, Salat, Tomate', featured: 1, sort: 8 },
    { cat: 'burger', name: 'Jumbo Hamburger', slug: 'jumbo-hamburger', desc: 'Doppeltes Rindfleisch, Brötchen, Salat, Tomate', price: 9.00, old: null, ingredients: 'Rindfleisch, Brötchen, Salat, Tomate', featured: 0, sort: 9 },
    { cat: 'burger', name: 'Jumbo Chicken Burger', slug: 'jumbo-chicken-burger', desc: 'Doppelte Hähnchenbrust, Brötchen, Salat, Tomate', price: 10.00, old: null, ingredients: 'Hähnchenbrust, Brötchen, Salat, Tomate', featured: 1, sort: 10 },
    { cat: 'burger', name: 'Mexico Burger', slug: 'mexico-burger', desc: 'Rindfleisch, Jalapeños, Käse, Brötchen, Salat', price: 8.00, old: null, ingredients: 'Rindfleisch, Jalapeños, Käse, Brötchen, Salat', featured: 0, sort: 11 },
    { cat: 'burger', name: 'Chili Cheeseburger', slug: 'chili-cheeseburger', desc: 'Rindfleisch, Chili, Käse, Brötchen, Salat', price: 7.50, old: null, ingredients: 'Rindfleisch, Chili, Käse, Brötchen, Salat', featured: 0, sort: 12 },
    { cat: 'burger', name: 'Menü1: Hamburger', slug: 'menu1-hamburger', desc: 'Hamburger + Pommes + Getränk', price: 10.00, old: null, ingredients: 'Hamburger, Pommes, Getränk', featured: 0, sort: 13 },
    { cat: 'burger', name: 'Menü2: Cheeseburger', slug: 'menu2-cheeseburger', desc: 'Cheeseburger + Pommes + Getränk', price: 10.50, old: null, ingredients: 'Cheeseburger, Pommes, Getränk', featured: 0, sort: 14 },
    { cat: 'burger', name: 'Menü3: Jumbo Cheeseburger', slug: 'menu3-jumbo-cheeseburger', desc: 'Jumbo Cheeseburger + Pommes + Getränk', price: 12.00, old: null, ingredients: 'Jumbo Cheeseburger, Pommes, Getränk', featured: 0, sort: 15 },
    { cat: 'burger', name: 'Menü4: Jumbo Chicken', slug: 'menu4-jumbo-chicken', desc: 'Jumbo Chicken Burger + Pommes + Getränk', price: 12.50, old: null, ingredients: 'Jumbo Chicken Burger, Pommes, Getränk', featured: 0, sort: 16 },
    { cat: 'pasta', name: 'Alla Panna', slug: 'alla-panna', desc: 'Pasta, Sahne, Butter, Parmesan', price: 7.00, old: null, ingredients: 'Pasta, Sahne, Butter, Parmesan', featured: 0, sort: 1 },
    { cat: 'pasta', name: 'Alla Milano', slug: 'alla-milano', desc: 'Pasta, Rindfleisch, Safran, Sahne, Parmesan', price: 8.00, old: null, ingredients: 'Pasta, Rindfleisch, Safran, Sahne, Parmesan', featured: 0, sort: 2 },
    { cat: 'pasta', name: 'Bolognese', slug: 'bolognese', desc: 'Pasta, Rindfleisch, Tomate, Zwiebel, Knoblauch', price: 7.50, old: null, ingredients: 'Pasta, Rindfleisch, Tomate, Zwiebel, Knoblauch', featured: 0, sort: 3 },
    { cat: 'pasta', name: 'Carbonara', slug: 'carbonara', desc: 'Pasta, Speck, Ei, Sahne, Parmesan', price: 7.50, old: null, ingredients: 'Pasta, Speck, Ei, Sahne, Parmesan', featured: 0, sort: 4 },
    { cat: 'pasta', name: 'Italia', slug: 'italia', desc: 'Pasta, Hühnerbrust, Tomate, Basilikum, Mozzarella', price: 8.30, old: null, ingredients: 'Pasta, Hühnerbrust, Tomate, Basilikum, Mozzarella', featured: 0, sort: 5 },
    { cat: 'pasta', name: 'Scampi', slug: 'scampi', desc: 'Pasta, Garnelen, Tomate, Knoblauch, Basilikum', price: 9.50, old: null, ingredients: 'Pasta, Garnelen, Tomate, Knoblauch, Basilikum', featured: 1, sort: 6 },
    { cat: 'pasta', name: 'Pastore', slug: 'pastore', desc: 'Pasta, Lamm, Tomate, Zwiebel, Parmesan', price: 7.50, old: null, ingredients: 'Pasta, Lamm, Tomate, Zwiebel, Parmesan', featured: 0, sort: 7 },
    { cat: 'pasta', name: 'Della Casa', slug: 'della-casa', desc: 'Pasta, Schinken, Pilze, Sahne, Parmesan', price: 8.90, old: null, ingredients: 'Pasta, Schinken, Pilze, Sahne, Parmesan', featured: 0, sort: 8 },
    { cat: 'pasta', name: 'Wunsch', slug: 'wunsch', desc: 'Pasta nach Wunsch mit Sauce nach Wunsch', price: 10.00, old: null, ingredients: 'Pasta nach Wahl', featured: 0, sort: 9 },
    { cat: 'pasta', name: 'Toscana', slug: 'toscana', desc: 'Pasta, Tomate, Knoblauch, Basilikum, Olivenöl', price: 7.50, old: null, ingredients: 'Pasta, Tomate, Knoblauch, Basilikum, Olivenöl', featured: 0, sort: 10 },
    { cat: 'pasta', name: 'Pesto und Put', slug: 'pesto-put', desc: 'Pasta, Pesto, Garnelen, Tomaten, Knoblauch', price: 8.90, old: null, ingredients: 'Pasta, Pesto, Garnelen, Tomaten, Knoblauch', featured: 0, sort: 11 },
    { cat: 'pasta', name: 'Pasta Classico', slug: 'pasta-classico', desc: 'Pasta mit klassischer Tomate-Knoblauch-Sauce', price: 7.90, old: null, ingredients: 'Pasta, Tomate, Knoblauch', featured: 0, sort: 12 },
    { cat: 'salate', name: 'Gemischter Salat', slug: 'gemischter-salat', desc: 'Gemischte Blätter, Tomate, Gurke, Zwiebel, Mais', price: 6.00, old: null, ingredients: 'Gemischte Blätter, Tomate, Gurke, Zwiebel, Mais', featured: 0, sort: 1 },
    { cat: 'salate', name: 'Tonno Salat', slug: 'tonno-salat', desc: 'Gemischte Blätter, Thunfisch, Tomate, Gurke, Zwiebel', price: 7.50, old: null, ingredients: 'Gemischte Blätter, Thunfisch, Tomate, Gurke, Zwiebel', featured: 0, sort: 2 },
    { cat: 'salate', name: 'Miüsta Salat', slug: 'miuesta-salat', desc: 'Gemischte Blätter, Hühnerbrust, Tomaten, Zwiebel', price: 8.00, old: null, ingredients: 'Gemischte Blätter, Hühnerbrust, Tomaten, Zwiebel', featured: 0, sort: 3 },
    { cat: 'salate', name: 'Ma Balla', slug: 'ma-balla', desc: 'Gemischte Blätter, Lamm, Tomaten, Zwiebel, Feta', price: 7.50, old: null, ingredients: 'Gemischte Blätter, Lamm, Tomaten, Zwiebel, Feta', featured: 0, sort: 4 },
    { cat: 'salate', name: 'Scampi Salat', slug: 'scampi-salat', desc: 'Gemischte Blätter, Garnelen, Tomate, Gurke, Zwiebel', price: 8.50, old: null, ingredients: 'Gemischte Blätter, Garnelen, Tomate, Gurke, Zwiebel', featured: 0, sort: 5 },
    { cat: 'salate', name: 'Chef Salat', slug: 'chef-salat', desc: 'Gemischte Blätter, Hühnerbrust, Speck, Ei, Tomaten', price: 7.50, old: null, ingredients: 'Gemischte Blätter, Hühnerbrust, Speck, Ei, Tomaten', featured: 0, sort: 6 },
    { cat: 'salate', name: 'Della Casa Salat', slug: 'della-casa-salat', desc: 'Gemischte Blätter, Schinken, Käse, Tomate, Ei, Zwiebel', price: 7.50, old: null, ingredients: 'Gemischte Blätter, Schinken, Käse, Tomate, Ei, Zwiebel', featured: 0, sort: 7 },
  ];

  let insertedCount = 0;
  for (const p of products) {
    await insertProd.run(catIds[p.cat], p.name, p.slug, p.desc, p.price, p.old, p.ingredients, p.featured, p.sort);
    insertedCount++;
  }
  console.log(`Inserted ${insertedCount} products`);

  console.log('Menu update completed successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
