require('dotenv').config();
const db = require('../db');

const newBurgers = [
  ['Hamburger Smash', 'hamburger-smash', '110 g Smash Beef, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 8.90, '110 g Smash Beef, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 0, 4, '/images/products/img13.jpg'],
  ['Cheeseburger Smash', 'cheeseburger-smash', '110 g Smash Beef, Cheddar, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 9.90, '110 g Smash Beef, Cheddar, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Burgersauce', 1, 5, '/images/products/img14.jpg'],
  ['Chickenburger', 'chickenburger', 'Crispy Chicken, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Chicken Sauce', 9.90, 'Crispy Chicken, Salat, Gewürzgurken, Tomate, rote Zwiebeln, Chicken Sauce', 0, 6, '/images/products/img15.jpg'],
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

async function migrate() {
  await db.initialize();
  const burgerCat = await db.get("SELECT * FROM categories WHERE slug = 'burger'");
  if (!burgerCat) throw new Error('Burger-Kategorie nicht gefunden');
  console.log(`Burger-Kategorie ID: ${burgerCat.id}`);

  await db.run('DELETE FROM products WHERE category_id = $1', [burgerCat.id]);
  console.log('Alte Burger gelöscht');

  await db.run(
    'UPDATE categories SET description = $1 WHERE id = $2',
    ['Smash Burger frisch für dich gesmasht. Für nur 5,00 € Aufpreis als Menü: 4 Zwiebelringe oder Pommes und ein 0,33 l Softdrink nach Wahl.', burgerCat.id]
  );

  for (const [name, slug, description, price, ingredients, is_featured, sort_order, image] of newBurgers) {
    await db.run(
      `INSERT INTO products (category_id, name, slug, description, price, old_price, image, ingredients, is_featured, is_available, sort_order)
       VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,1,$9)
       ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id, name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, image=EXCLUDED.image, ingredients=EXCLUDED.ingredients, is_featured=EXCLUDED.is_featured, is_available=1, sort_order=EXCLUDED.sort_order`,
      [burgerCat.id, name, slug, description, price, image, ingredients, is_featured, sort_order]
    );
  }
  console.log(`Erfolgreich: ${newBurgers.length} neue Burger eingefügt`);
  const check = await db.all('SELECT name, price FROM products WHERE category_id = $1 ORDER BY sort_order', [burgerCat.id]);
  console.log(JSON.stringify(check, null, 2));
  process.exit(0);
}

migrate().catch((e) => { console.error('Migration fehlgeschlagen:', e); process.exit(1); });
