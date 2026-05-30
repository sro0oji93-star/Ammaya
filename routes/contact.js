const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const settingsRows = await db.all('SELECT key, value FROM settings');
  const settings = Object.fromEntries(settingsRows.map(s => [s.key, s.value]));
  
  res.render('kontakt', {
    title: 'Kontakt – ' + settings.site_name,
    settings
  });
});

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await db.run('INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
  } catch (err) {
    console.error('Fehler beim Speichern der Kontaktnachricht:', err);
  }
  req.session.contactFlash = 'Vielen Dank für Ihre Nachricht! Wir werden uns schnellstmöglich bei Ihnen melden.';
  res.redirect('/kontakt');
});

module.exports = router;
