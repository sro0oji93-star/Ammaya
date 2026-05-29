require('dotenv').config();
require('express-async-errors');
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const { initDatabase } = require('./db');

async function start() {
  await initDatabase();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'geheimnis',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.site_url = process.env.SITE_URL || 'http://localhost:3000';
    next();
  });

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use('/', require('./routes/index'));
  app.use('/speisekarte', require('./routes/menu'));
  app.use('/warenkorb', require('./routes/cart'));
  app.use('/bestellung', require('./routes/order'));
  app.use('/kontakt', require('./routes/contact'));
  app.use('/admin', require('./routes/admin'));

  app.use((req, res) => {
    res.status(404).render('404', { title: 'Seite nicht gefunden' });
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err.message, err.stack);
    res.status(500).send('Internal Server Error: ' + err.message);
  });

  app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
