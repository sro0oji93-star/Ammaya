const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);
  
  res.render('kontakt', {
    title: 'Kontakt – ' + settings.site_name,
    settings
  });
});

router.post('/', (req, res) => {
  const { name, email, message } = req.body;
  req.session.contactFlash = 'Vielen Dank für Ihre Nachricht! Wir werden uns schnellstmöglich bei Ihnen melden.';
  res.redirect('/kontakt');
});

module.exports = router;
