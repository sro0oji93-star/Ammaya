const express = require('express');
const router = express.Router();
const db = require('../db');
const { validateExtras } = require('../extras');

// Tageszeit-Angebote: Bestellfenster in Europe/Berlin (Server auf Render läuft in UTC!)
function berlinMinutes() {
  try {
    const s = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    const parts = s.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } catch (e) {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

const TIME_DEALS = {
  'nexo-mittag-deal': { from: 12 * 60, to: 15 * 60, message: 'Der Mittag Deal ist nur von 12:00 bis 15:00 Uhr bestellbar.' },
  'nexo-night-deal': { from: 21 * 60, to: 24 * 60, message: 'Der Night Deal ist erst ab 21:00 Uhr bestellbar (nur Abholer).' },
  'deal-night-abholung': { from: 21 * 60, to: 24 * 60, message: 'Der Night Deal ist erst ab 21:00 Uhr bestellbar (nur Abholer).' }
};

// Liefergebiet serverseitig prüfen (Nominatim-Geocoding + OSRM-Fahrstrecke).
// Ergebnis: { km } (km=null -> unverifiziert, fail-open) oder { km, noRoute:true } (keine Fahrstrecke -> nicht lieferbar)
// NEXO Lieferservice-Zonen: Fahrstrecke -> Zuschlag + Mindestbestellwert (bis 15 km, darüber Anruf)
const DELIVERY_ZONES = [
  { to: 3, fee: 1.00, min: 15.00 },
  { to: 5, fee: 1.50, min: 20.00 },
  { to: 7, fee: 2.50, min: 25.00 },
  { to: 10, fee: 3.50, min: 30.00 },
  { to: 12, fee: 4.50, min: 35.00 },
  { to: 15, fee: 6.00, min: 40.00 }
];

function findDeliveryZone(km) {
  for (const z of DELIVERY_ZONES) {
    if (km <= z.to + 1e-9) return z;
  }
  return null;
}

async function checkDeliveryArea(address, zip, city, settings) {
  const rLat = parseFloat((settings && (settings.restaurant_lat || settings.latitude)) || 53.295344);
  const rLon = parseFloat((settings && (settings.restaurant_lon || settings.longitude)) || 10.391293);
  if (!isFinite(rLat) || !isFinite(rLon)) return { km: null };
  const q = [address, zip, city].filter(Boolean).join(', ');
  if (!q.trim()) return { km: null };
  const fetchOpts = { headers: { 'User-Agent': 'Ammaya-Restaurant-Shop/1.0 (info@ammaya.de)', 'Accept-Language': 'de' }, signal: AbortSignal.timeout(8000) };
  try {
    const geoUrl = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q=' + encodeURIComponent(q);
    const geoRes = await fetch(geoUrl, fetchOpts);
    const geo = await geoRes.json();
    if (!Array.isArray(geo) || !geo.length || !isFinite(parseFloat(geo[0].lat))) return { km: null };
    const cLat = parseFloat(geo[0].lat);
    const cLon = parseFloat(geo[0].lon);
    const routeUrl = 'https://router.project-osrm.org/route/v1/driving/' + rLon + ',' + rLat + ';' + cLon + ',' + cLat + '?overview=false';
    const routeRes = await fetch(routeUrl, fetchOpts);
    const route = await routeRes.json();
    if (!route || !route.routes || !route.routes.length || typeof route.routes[0].distance !== 'number') {
      return { km: null, noRoute: true }; // keine Fahrstrecke -> nicht lieferbar
    }
    const km = route.routes[0].distance / 1000;
    return { km: Math.round(km * 10) / 10 };
  } catch (e) {
    console.error('Liefergebiets-Prüfung übersprungen:', e.message);
    return { km: null };
  }
}
function isValidPhone(p) {
  if (p == null) return false;
  const s = String(p).trim();
  if (!/^[+\d\s(][\d\s\-/().]*$/.test(s)) return false;
  let digits = s.replace(/\D/g, '');
  if (digits.slice(0, 2) === '00') digits = digits.slice(2);
  if (digits.length < 7 || digits.length > 15) return false;
  return digits.charAt(0) === '0' || digits.slice(0, 2) === '49';
}

router.get('/', async (req, res) => {
  const settings = res.locals.settings;
  
  res.render('checkout', {
    title: 'Kasse – ' + settings.site_name,
    settings
  });
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, zip, notes, payment, items, discount_code, orderType } = req.body;

    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Bitte geben Sie eine gültige Telefonnummer an (z. B. 0151 23456789).' });
    }

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const type = orderType === 'abholung' ? 'abholung' : 'lieferung';

    // Liefergebiet + Zonenpreise serverseitig prüfen (nur Lieferung; Abholung bleibt immer möglich)
    let zone = null;
    let areaKm = null;
    if (type === 'lieferung') {
      const area = await checkDeliveryArea(address, zip, city, res.locals.settings);
      const s = res.locals.settings || {};
      const tel = s.phone || '04131 4006817';
      if (area.noRoute) {
        return res.status(400).json({ success: false, message: 'Ihre Adresse ist mit dem Auto leider nicht erreichbar. Bitte rufen Sie uns an: ' + tel + ' – oder wählen Sie Abholung.' });
      }
      if (area.km != null) {
        areaKm = area.km;
        const cap = parseFloat(s.max_delivery_km) || 15;
        if (area.km > cap + 1e-9) {
          return res.status(400).json({ success: false, message: 'Ihre Adresse liegt über 15 km Fahrstrecke von uns entfernt. Bitte rufen Sie uns an: ' + tel + ' – oder wählen Sie Abholung.' });
        }
        zone = findDeliveryZone(area.km);
      }
    }

    let calculatedSubtotal = 0;
    const nowBerlinMin = berlinMinutes();
    let hasPickupOnlyDeal = false;
    // Saucenliste für Gratis-Sauce (Rings, Pizza Brötchen) – einmal laden
    const sauceCatRow = await db.get("SELECT id FROM categories WHERE slug = 'saucen-dips'");
    const validSauces = sauceCatRow
      ? (await db.all('SELECT name FROM products WHERE category_id = $1', [sauceCatRow.id])).map(r => r.name)
      : [];
    for (const item of parsedItems) {
      const product = await db.get('SELECT p.id, p.slug, p.price, p.sizes, c.slug AS catslug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1', [item.id]);
      if (!product) {
        return res.status(400).json({ success: false, message: 'Produkt nicht gefunden: ' + item.name });
      }
      if (product.slug === 'nexo-night-deal' || product.slug === 'deal-night-abholung') hasPickupOnlyDeal = true;
      // Tageszeit-Angebote serverseitig prüfen (Client-Zeit kann manipuliert sein)
      const rule = TIME_DEALS[product.slug];
      if (rule && (nowBerlinMin < rule.from || nowBerlinMin >= rule.to)) {
        return res.status(400).json({ success: false, message: rule.message });
      }
      let realPrice;
      if (item.size && product.sizes) {
        const sizes = JSON.parse(product.sizes);
        const matchedSize = sizes.find(s => s.label === item.size.label && parseFloat(s.price) === parseFloat(item.size.price));
        if (!matchedSize) {
          return res.status(400).json({ success: false, message: 'Ungültige Größe für: ' + item.name });
        }
        realPrice = parseFloat(matchedSize.price);
        // Extras & Beläge (Pizza): serverseitig gegen Preisliste prüfen
        try {
          const { extras, total } = validateExtras(item.size.label, item.extras);
          item.extras = extras;
          realPrice = parseFloat((realPrice + total).toFixed(2));
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Ungültige Extras für: ' + item.name });
        }
        // Snacks-Menü (+4 € mit Softdrink): nur für Snacks, Drink aus fester Liste
        if (item.menue && item.menue.drink) {
          const menueDrinks = ['Coca-Cola', 'Fanta', 'Sprite', 'Mezzo Mix', 'Coca-Cola Zero'];
          if (product.catslug !== 'snacks' || !menueDrinks.includes(item.menue.drink)) {
            return res.status(400).json({ success: false, message: 'Ungültiges Menü für: ' + item.name });
          }
          item.extras.push({ name: 'Menü mit ' + item.menue.drink, price: 4.00 });
          realPrice = parseFloat((realPrice + 4).toFixed(2));
          delete item.menue;
        } else {
          delete item.menue;
        }
        // Gratis-Sauce (Rings, Pizza Brötchen): Name gegen Saucen-Liste prüfen, Preis 0
        if (typeof item.sauce === 'string' && item.sauce) {
          if ((product.catslug !== 'rings' && product.catslug !== 'pizza-broetchen') || !validSauces.includes(item.sauce)) {
            return res.status(400).json({ success: false, message: 'Ungültige Sauce für: ' + item.name });
          }
          item.extras.push({ name: 'Sauce: ' + item.sauce, price: 0 });
          delete item.sauce;
        } else {
          delete item.sauce;
        }
      } else {
        realPrice = parseFloat(product.price);
        delete item.extras;
        delete item.menue;
        // Gratis-Sauce auch ohne Größe möglich (Rings)
        if (typeof item.sauce === 'string' && item.sauce) {
          if ((product.catslug !== 'rings' && product.catslug !== 'pizza-broetchen') || !validSauces.includes(item.sauce)) {
            return res.status(400).json({ success: false, message: 'Ungültige Sauce für: ' + item.name });
          }
          item.extras = [{ name: 'Sauce: ' + item.sauce, price: 0 }];
          delete item.sauce;
        } else {
          delete item.sauce;
        }
      }
      // Notiz pro Position (aus der Kasse), max. 200 Zeichen
      if (typeof item.note === 'string' && item.note.trim()) {
        item.note = item.note.trim().slice(0, 200);
      } else {
        delete item.note;
      }
      const qty = Math.max(1, Math.min(20, parseInt(item.qty) || 1));
      item.price = realPrice;
      item.qty = qty;
      calculatedSubtotal += realPrice * qty;
    }
    
    const settings = res.locals.settings;
    // Night Deal: Abholung erzwingen (Client-Angabe nicht vertrauen)
    if (hasPickupOnlyDeal && type !== 'abholung') {
      return res.status(400).json({ success: false, message: 'Der Night Deal ist nur für Abholer – bitte Abholung wählen.' });
    }
    // Zonen-Mindestbestellwert prüfen (Zwischensumme vor Rabatt)
    if (zone && calculatedSubtotal < zone.min - 1e-9) {
      const kmTxt = areaKm != null ? String(areaKm).replace('.', ',') + ' km' : '';
      return res.status(400).json({ success: false, message: 'Der Mindestbestellwert für Ihre Entfernung (' + kmTxt + ') beträgt ' + zone.min.toFixed(2).replace('.', ',') + ' €. Bitte fügen Sie noch Artikel hinzu.' });
    }
    // Zonen-Lieferzuschlag (fix je Zone); ohne Zone alte Pauschal-Logik als Fallback
    const deliveryFee = parseFloat(settings.delivery_fee) || 4.50;
    const freeFrom = parseFloat(settings.free_delivery_from) || 0;
    let calculatedDelivery;
    if (type === 'abholung') calculatedDelivery = 0;
    else if (zone) calculatedDelivery = zone.fee;
    else calculatedDelivery = calculatedSubtotal >= freeFrom ? 0 : deliveryFee;
    
    let calculatedDiscount = 0;
    let validCode = null;
    if (discount_code) {
      const now = new Date().toISOString().split('T')[0];
      const discount = await db.get(`SELECT * FROM discounts WHERE code = $1 AND active = 1 AND (expires_at IS NULL OR expires_at > $2) AND (usage_limit = 0 OR used_count < usage_limit)`, [discount_code, now]);
      if (discount && (!discount.min_order || calculatedSubtotal >= parseFloat(discount.min_order))) {
        validCode = discount_code;
        calculatedDiscount = discount.type === 'prozent'
          ? (calculatedSubtotal * parseFloat(discount.value) / 100)
          : parseFloat(discount.value);
      }
    }
    
    const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedDelivery - calculatedDiscount);
    
    const orderNumber = 'FEIN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    await db.run(`INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_zip, notes, items, subtotal, delivery_fee, discount, discount_code, total, payment_method, payment_status, order_status, order_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [orderNumber, name, email, phone, address, city, zip, notes,
      JSON.stringify(parsedItems), calculatedSubtotal, calculatedDelivery, calculatedDiscount, validCode, calculatedTotal,
      payment, payment === 'online' ? 'ausstehend' : 'bar', 'neu', type]
    );
    
    if (validCode) {
      await db.run('UPDATE discounts SET used_count = used_count + 1 WHERE code = $1', [validCode]);
    }
    
    res.json({ success: true, orderNumber, message: 'Bestellung erfolgreich aufgegeben!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Fehler bei der Bestellung' });
  }
});

router.post('/rabatt-pruefen', async (req, res) => {
  const { code, subtotal } = req.body;
  const now = new Date().toISOString().split('T')[0];
  const discount = await db.get(`SELECT * FROM discounts WHERE code = $1 AND active = 1 AND (expires_at IS NULL OR expires_at > $2) AND (usage_limit = 0 OR used_count < usage_limit)`, [code, now]);
  
  if (!discount) return res.json({ valid: false, message: 'Rabattcode ungültig oder abgelaufen' });
  
  if (discount.min_order > 0 && subtotal < discount.min_order) {
    return res.json({ valid: false, message: 'Mindestbestellwert von ' + discount.min_order.toFixed(2) + ' € nicht erreicht' });
  }
  
  let discountValue = 0;
  if (discount.type === 'prozent') {
    discountValue = (subtotal * discount.value / 100);
  } else {
    discountValue = discount.value;
  }
  
  res.json({ valid: true, value: parseFloat(discountValue.toFixed(2)), type: discount.type, message: 'Rabatt angewendet!' });
});

router.get('/bestellung/:orderNumber', async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE order_number = $1', [req.params.orderNumber]);
  if (!order) return res.status(404).render('404', { title: 'Bestellung nicht gefunden' });
  
  const settings = res.locals.settings;
  
  res.render('order-confirmation', {
    title: 'Bestellung ' + order.order_number + ' – ' + settings.site_name,
    order,
    settings
  });
});

module.exports = router;
