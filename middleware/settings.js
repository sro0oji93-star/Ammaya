const db = require('../db');

function loadSettings(req, res, next) {
  db.all('SELECT key, value FROM settings').then(rows => {
    res.locals.settings = Object.fromEntries(rows.map(s => [s.key, s.value]));
    next();
  }).catch(() => {
    res.locals.settings = {};
    next();
  });
}

module.exports = { loadSettings };
