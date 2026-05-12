require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');

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

const indexRoutes = require('./routes/index');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/speisekarte', menuRoutes);
app.use('/warenkorb', cartRoutes);
app.use('/bestellung', orderRoutes);
app.use('/kontakt', contactRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Seite nicht gefunden' });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
