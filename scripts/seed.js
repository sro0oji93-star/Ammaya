const db = require('../db');

async function seed() {
  await db.initialize();

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
    ['Saucen & Dips', 'saucen-dips', 'Hausgemachte Saucen und Dips für jeden Geschmack', 10]
  ];

  const products = [
    [1, 'Margherita', 'margherita', 'Tomatensauce, Mozzarella, frischer Basilikum', 9.90, null, '/images/products/img1.jpg', null, 1, 1],
    [1, 'Salami', 'salami', 'Tomatensauce, Mozzarella, pikante Salami', 11.90, null, '/images/products/img2.jpg', null, 1, 2],
    [1, 'Prosciutto', 'prosciutto', 'Tomatensauce, Mozzarella, luftgetrockneter Schinken, Rucola', 13.90, null, '/images/products/img3.jpg', null, 0, 3],
    [2, 'Classic Burger', 'classic-burger', 'Rinderpattie, Cheddar, Salat, Tomate, Zwiebeln, hausgemachte Sauce', 14.90, null, '/images/products/img13.jpg', null, 1, 4],
    [2, 'Cheese Burger', 'cheese-burger', 'Rinderpattie, doppelter Cheddar, Gurken, karamellisierte Zwiebeln', 15.90, null, '/images/products/img14.jpg', null, 0, 5],
    [2, 'Chicken Burger', 'chicken-burger', 'Knuspriges Hähnchenfilet, Eisbergsalat, Tomate, Knoblauchsauce', 13.90, null, '/images/products/img15.jpg', null, 0, 6],
    [3, 'Croque Monsieur', 'croque-monsieur', 'Toast mit Schinken und Käse überbacken mit Béchamelsauce', 8.90, null, '/images/products/img7.jpg', null, 1, 7],
    [3, 'Croque Madame', 'croque-madame', 'Croque Monsieur mit Spiegelei und Trüffelmayo', 10.90, null, '/images/products/img8.jpg', null, 0, 8],
    [3, 'Croque Hawaii', 'croque-hawaii', 'Toast mit Schinken, Ananas und Käse überbacken', 9.90, null, '/images/products/img9.jpg', null, 0, 9],
    [4, 'Griechischer Salat', 'griechischer-salat', 'Frischer Salat mit Feta, Oliven, Gurken, Tomaten und Oregano-Dressing', 11.90, null, '/images/products/img4.jpg', null, 1, 10],
    [4, 'Caesar Salat', 'caesar-salat', 'Römersalat mit Hähnchen, Croutons, Parmesan und Caesar-Dressing', 12.90, null, '/images/products/img5.jpg', null, 0, 11],
    [5, 'Spaghetti Bolognese', 'spaghetti-bolognese', 'Spaghetti mit hausgemachter Fleischsoße und Parmesan', 12.90, null, '/images/products/img10.jpg', null, 1, 12],
    [5, 'Penne Arrabiata', 'penne-arrabiata', 'Penne in scharfer Tomatensoße mit Knoblauch und Chili', 10.90, null, '/images/products/img11.jpg', null, 0, 13],
    [6, 'Wiener Schnitzel', 'wiener-schnitzel', 'Kalbfleisch paniert und goldbraun gebraten, mit Preiselbeeren und Zitrone', 16.90, null, '/images/products/img16.jpg', null, 1, 14],
    [6, 'Jägerschnitzel', 'jaegerschnitzel', 'Schweineschnitzel mit cremiger Pilzsoße und Pommes', 15.90, null, '/images/products/img17.jpg', null, 0, 15],
    [6, 'Zigeunerschnitzel', 'zigeunerschnitzel', 'Schnitzel mit bunter Paprika-Zwiebel-Soße und Reis', 15.90, null, '/images/products/img18.jpg', null, 0, 16],
    [7, 'Pommes Frites', 'pommes-frites', 'Knusprige Pommes mit hausgemachter Mayo oder Ketchup', 5.90, null, '/images/products/img19.jpg', null, 0, 17],
    [7, 'Chicken Nuggets', 'chicken-nuggets', 'Knusprige Hähnchen-Nuggets mit Dipsauce', 8.90, null, '/images/products/img20.jpg', null, 0, 18],
    [7, 'Nachos', 'nachos', 'Knusprige Nachos mit Käsesauce, Jalapeños und Sour Cream', 9.90, null, '/images/products/img21.jpg', null, 0, 19],
    [8, 'Coca Cola', 'coca-cola', 'Eisgekühlte Coca Cola 0,33l', 3.50, null, '/images/products/img22.jpg', null, 0, 20],
    [8, 'Fanta', 'fanta', 'Eisgekühlte Fanta 0,33l', 3.50, null, '/images/products/img23.jpg', null, 0, 21],
    [8, 'Wasser', 'wasser', 'Natürliches Mineralwasser 0,75l', 3.00, null, '/images/products/img6.jpg', null, 0, 22],
    [9, 'Frühlingsrolle', 'fruehlingsrolle', 'Knusprige Frühlingsrollen mit süß-saurer Dippsauce', 6.90, null, '/images/products/img7.jpg', null, 0, 23],
    [9, 'Falafel Wrap', 'falafel-wrap', 'Vegetarischer Wrap mit Falafel, Hummus und frischem Gemüse', 8.90, null, '/images/products/img8.jpg', null, 0, 24],
    [10, 'Ketchup', 'ketchup', 'Hausgemachter Ketchup 50ml', 1.50, null, '/images/products/img9.jpg', null, 0, 25],
    [10, 'Mayonnaise', 'mayonnaise', 'Hausgemachte Mayonnaise 50ml', 1.50, null, '/images/products/img12.jpg', null, 0, 26],
    [10, 'Knoblauchsauce', 'knoblauchsauce', 'Cremige Knoblauchsauce 50ml', 1.50, null, '/images/products/img3.jpg', null, 0, 27],
    [10, 'Chillisauce', 'chillisauce', 'Scharfe Chillisauce 50ml', 1.50, null, '/images/products/img4.jpg', null, 0, 28]
  ];

  try {
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM categories');

    for (const c of categories) {
      await db.run('INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)', c);
    }

    for (const p of products) {
      await db.run('INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', p);
    }

    await db.run("UPDATE settings SET value = $1 WHERE key = $2", ['Ammaya', 'site_name']);
    await db.run("UPDATE settings SET value = $1 WHERE key = $2", ['Ihr Restaurant für Pizza, Burger und mehr', 'site_description']);

    console.log('Seed erfolgreich abgeschlossen!');
    console.log('Kategorien: ' + categories.length);
    console.log('Produkte: ' + products.length);
  } catch (e) {
    console.error('Fehler beim Seed:', e.message);
  }
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
