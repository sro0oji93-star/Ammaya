const { db, initDatabase } = require('./db');

const imageMap = {
  'pommes-snacks': '/images/pommes-snacks.png',
  'snack-rolls': '/images/snack-rolls.png',
  'croque': '/images/croque-menu.png',
  'chicken-fingerfood': '/images/chicken-fingerfood.png',
  'burger': '/images/burger-menu.png',
  'pasta': '/images/pasta-menu.png',
  'salate': '/images/salat-menu.png',
};

async function run() {
  await initDatabase();
  const update = db.prepare("UPDATE categories SET image = ? WHERE slug = ?");
  for (const [slug, image] of Object.entries(imageMap)) {
    await update.run(image, slug);
    console.log(`Updated ${slug} -> ${image}`);
  }
  console.log('All category images updated!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
