require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = new pgSession({
  conString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ammaya',
  tableName: 'session',
  createTableIfMissing: true
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.site_url = process.env.SITE_URL || 'http://localhost:3000';
  next();
});

const { loadSettings } = require('./middleware/settings');
app.use(loadSettings);

const { csrfProtection, generateToken } = require('./middleware/csrf');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const indexRoutes = require('./routes/index');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

// CSRF for public routes (admin has its own CSRF handling)
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) return next();
  csrfProtection(req, res, next);
});
app.use('/', indexRoutes);
app.use('/speisekarte', menuRoutes);
app.use('/warenkorb', cartRoutes);
app.use('/bestellung', orderRoutes);
app.use('/kontakt', contactRoutes);

// Admin routes: login POST skips CSRF validation but still sets the token
app.use('/admin', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/login') {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateToken();
    }
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }
  csrfProtection(req, res, next);
});
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Seite nicht gefunden' });
});

const db = require('./db');
db.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
