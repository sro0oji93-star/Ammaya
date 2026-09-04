/* Cart Module */
var Cart = (function() {
  var items = [];
  var discount = { code: null, value: 0 };
  var orderType = 'lieferung';
  var settings = window.restaurantSettings || { delivery_fee: 4.50, free_delivery_from: 40.00 };

  function makeKey(id, size, extras) {
    var base = size && size.label ? id + '-' + size.label : String(id);
    if (extras && extras.length) {
      var names = extras.map(function(e) { return e.name; }).sort();
      base += '|x:' + names.join('+');
    }
    return base;
  }

  function migrateKeys() {
    items.forEach(function(i) {
      i._key = makeKey(i.id, i.size, i.extras);
    });
  }

  function init() {
    load();
    renderCartBadge();
    bindAddToCart();
    applyDealWindows();
    // Kasse: Extra entfernen + Notiz pro Position (delegiert, einmalig)
    document.addEventListener('click', function(e) {
      var x = e.target && e.target.closest ? e.target.closest('.co-extra-x') : null;
      if (x) removeExtra(x.getAttribute('data-key'), x.getAttribute('data-extra'));
    });
    document.addEventListener('input', function(e) {
      var n = e.target && e.target.closest ? e.target.closest('.co-note') : null;
      if (n) setItemNote(n.getAttribute('data-key'), n.value);
    });
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) { bindOrderType(); applyPickupRules(); renderCheckoutSummary(); }
  }

  function load() {
    try {
      var data = localStorage.getItem('feinCart');
      if (data) items = JSON.parse(data);
      items.forEach(function(i) {
        if (!i.extras) i.extras = [];
        if (typeof i.pickupOnly === 'undefined') i.pickupOnly = false;
        i._key = makeKey(i.id, i.size, i.extras);
      });
      var disc = localStorage.getItem('feinDiscount');
      if (disc) discount = JSON.parse(disc);
      var ot = localStorage.getItem('feinOrderType');
      if (ot === 'abholung' || ot === 'lieferung') orderType = ot;
    } catch(e) { items = []; }
  }

  function save() {
    localStorage.setItem('feinCart', JSON.stringify(items));
    localStorage.setItem('feinDiscount', JSON.stringify(discount));
    localStorage.setItem('feinOrderType', orderType);
  }

  function getOrderType() { return orderType; }

  function setOrderType(t) {
    if (t !== 'abholung' && t !== 'lieferung') return;
    orderType = t;
    save();
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  function needsPickupOnly() {
    return items.some(function(i) { return !!i.pickupOnly; });
  }

  function addItem(id, name, price, qty, size, extras, pickupOnly) {
    qty = qty || 1;
    extras = extras || [];
    var key = makeKey(id, size, extras);
    var existing = items.find(function(i) { return i._key === key; });
    if (existing) {
      existing.qty += qty;
      if (pickupOnly) existing.pickupOnly = true;
    } else {
      items.push({ _key: key, id: id, name: name, price: parseFloat(price), qty: qty, size: size || null, extras: extras, pickupOnly: !!pickupOnly });
    }
    save();
    renderCartBadge();
    showToast('"' + name + '" zum Warenkorb hinzugefügt!');
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  function removeItem(key) {
    items = items.filter(function(i) { return i._key !== key; });
    save();
    renderCartBadge();
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  function updateQty(key, qty) {
    var item = items.find(function(i) { return i._key === key; });
    if (item) {
      item.qty = Math.max(1, Math.min(20, qty));
      save();
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }
  }

  function getSubtotal() {
    return items.reduce(function(sum, i) { return sum + (i.price * i.qty); }, 0);
  }

  function getDeliveryFee(subtotal) {
    if (orderType === 'abholung') return 0;
    var fee = parseFloat(settings.delivery_fee) || 4.50;
    var freeFrom = parseFloat(settings.free_delivery_from) || 40.00;
    return subtotal >= freeFrom ? 0 : fee;
  }

  function getTotal() {
    var sub = getSubtotal();
    var fee = getDeliveryFee(sub);
    var disc = discount.value;
    return Math.max(0, sub + fee - disc);
  }

  function applyDiscount(code) {
    var discData = window.discounts || [];
    var found = discData.find(function(d) {
      return d.code === code && d.active == 1;
    });
    if (!found) {
      discount.code = null;
      discount.value = 0;
      save();
      return { valid: false, message: 'Rabattcode ungültig' };
    }
    var sub = getSubtotal();
    if (parseFloat(found.min_order) > 0 && sub < parseFloat(found.min_order)) {
      return { valid: false, message: 'Mindestbestellwert ' + parseFloat(found.min_order).toFixed(2) + ' € nicht erreicht' };
    }
    var val = found.type === 'prozent' ? (sub * parseFloat(found.value) / 100) : parseFloat(found.value);
    discount.code = code;
    discount.value = parseFloat(val.toFixed(2));
    save();
    return { valid: true, message: 'Rabatt von ' + discount.value.toFixed(2) + ' € angewendet!' };
  }

  function clearDiscount() {
    discount.code = null;
    discount.value = 0;
    save();
  }

  function renderCartBadge() {
    var badge = document.getElementById('cartBadgeMad');
    if (!badge) badge = document.getElementById('cartBadge');
    if (badge) {
      var count = items.reduce(function(s, i) { return s + i.qty; }, 0);
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  function showToast(msg) {
    var toast = document.getElementById('cartToast');
    var toastMsg = document.getElementById('cartToastMsg');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 2500);
    }
  }

  // Tageszeit-Angebote: Button außerhalb des Bestellfensters deaktivieren + Hinweis zeigen
  // (Serverseitig wird beim Checkout erneut streng geprüft)
  function applyDealWindows() {
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var btns = document.querySelectorAll('.add-to-cart[data-deal-from]');
    for (var bi = 0; bi < btns.length; bi++) {
      (function(btn) {
        var from = parseInt(String(btn.getAttribute('data-deal-from')).replace(/[^\d]/g, ''), 10);
        var to = parseInt(String(btn.getAttribute('data-deal-to')).replace(/[^\d]/g, ''), 10);
        if (isFinite(from) && isFinite(to) && mins >= from && mins < to) return;
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        if (!btn.parentElement || btn.parentElement.querySelector('.deal-hint')) return;
        var hint = document.createElement('div');
        hint.className = 'deal-hint';
        hint.style.cssText = 'margin-top:6px;font-size:12px;color:#eb0029;font-weight:700';
        hint.textContent = btn.getAttribute('data-deal-hint') || 'Aktuell nicht verfügbar';
        btn.insertAdjacentElement('afterend', hint);
      })(btns[bi]);
    }
  }

  // Bestellart-Umschalter an der Kasse (Abholung blendet Lieferadresse aus)
  function bindOrderType() {
    var radios = document.querySelectorAll('input[name="orderType"]');
    if (!radios.length) return;
    radios.forEach(function(r) {
      if (r.value === orderType) r.checked = true;
      r.addEventListener('change', function() {
        if (needsPickupOnly() && this.value === 'lieferung') {
          applyPickupRules();
          return;
        }
        setOrderType(this.value);
        toggleAddress(this.value);
      });
    });
    toggleAddress(orderType);
  }

  function toggleAddress(t) {
    var isPickup = (t === 'abholung');
    var card = document.getElementById('addressCard');
    var payCard = document.getElementById('paymentCard');
    var addr = document.getElementById('address');
    var city = document.getElementById('city');
    var zip = document.getElementById('zip');
    if (card) card.style.display = isPickup ? 'none' : '';
    if (payCard) payCard.style.display = isPickup ? 'none' : '';
    [addr, city, zip].forEach(function(f) { if (f) f.required = !isPickup; });
  }

  // Night Deal o.ä.: Bestellart auf Abholung zwingen
  function applyPickupRules() {
    var note = document.getElementById('pickupOnlyNote');
    var lieferRadio = document.querySelector('input[name="orderType"][value="lieferung"]');
    var abholRadio = document.querySelector('input[name="orderType"][value="abholung"]');
    if (needsPickupOnly()) {
      orderType = 'abholung';
      save();
      if (lieferRadio) lieferRadio.disabled = true;
      if (abholRadio) abholRadio.checked = true;
      if (note) note.style.display = 'block';
      toggleAddress('abholung');
    } else {
      if (lieferRadio) lieferRadio.disabled = false;
      if (note) note.style.display = 'none';
      var checked = document.querySelector('input[name="orderType"]:checked');
      toggleAddress(checked ? checked.value : orderType);
    }
  }

  function bindAddToCart() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');
      var hasSizes = btn.getAttribute('data-has-sizes');
      var pickupOnly = btn.getAttribute('data-pickup-only') === '1';
      var qtyInput = document.getElementById('qtyInput');
      var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

      if (hasSizes) {
        var radio = document.querySelector('input[name="size_' + id + '"]:checked') || document.querySelector('input[name="detailSize"]:checked');
        if (!radio) { showToast('Bitte wählen Sie eine Größe'); return; }
        var size = {
          label: radio.getAttribute('data-label'),
          price: parseFloat(radio.value)
        };
        var extras = [];
        var extrasBox = document.querySelector('[data-extras-for="' + id + '"]');
        if (extrasBox) {
          var checked = extrasBox.querySelectorAll('input[type="checkbox"]:checked');
          for (var ci = 0; ci < checked.length; ci++) {
            var nm = checked[ci].getAttribute('data-extra-name');
            var pr = parseFloat(checked[ci].getAttribute('data-extra-price'));
            if (nm && !isNaN(pr)) extras.push({ name: nm, price: parseFloat(pr.toFixed(2)) });
          }
        }
        var unit = size.price;
        extras.forEach(function(e) { unit += e.price; });
        unit = parseFloat(unit.toFixed(2));
        addItem(id, name, unit, qty, size, extras, pickupOnly);
      } else {
        var price = btn.getAttribute('data-price');
        addItem(id, name, price, qty, null, [], pickupOnly);
      }

      if (qtyInput) qtyInput.value = 1;
    });
  }

  function formatEUR(amount) {
    return amount.toFixed(2).replace('.', ',') + ' €';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Deutsche Rufnummer prüfen: nur erlaubte Zeichen, 7–15 Ziffern, 0… oder +49…
  function isValidPhone(p) {
    if (p == null) return false;
    var s = String(p).trim();
    if (!/^[+\d\s(][\d\s\-/().]*$/.test(s)) return false;
    var digits = s.replace(/\D/g, '');
    if (digits.slice(0, 2) === '00') digits = digits.slice(2);
    if (digits.length < 7 || digits.length > 15) return false;
    return digits.charAt(0) === '0' || digits.slice(0, 2) === '49';
  }

  // Extra aus einer Position in der Kasse entfernen (Preis wird neu berechnet)
  function removeExtra(key, extraName) {
    var item = items.find(function(i) { return i._key === key; });
    if (!item || !item.extras) return;
    var removed = 0;
    item.extras = item.extras.filter(function(e) {
      if (e.name === extraName) { removed += parseFloat(e.price) || 0; return false; }
      return true;
    });
    item.price = parseFloat((item.price - removed).toFixed(2));
    var newKey = makeKey(item.id, item.size, item.extras);
    var other = null;
    for (var k = 0; k < items.length; k++) {
      if (items[k]._key === newKey && items[k] !== item) { other = items[k]; break; }
    }
    if (other) {
      other.qty = Math.max(1, Math.min(20, other.qty + item.qty));
      if (!other.note && item.note) other.note = item.note;
      items = items.filter(function(i) { return i !== item; });
    } else {
      item._key = newKey;
    }
    save();
    renderCartBadge();
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  // Notiz pro Position (nur Kasse) – speichert ohne Neuzeichnen (Fokus bleibt)
  function setItemNote(key, text) {
    var item = items.find(function(i) { return i._key === key; });
    if (!item) return;
    text = String(text == null ? '' : text).slice(0, 200);
    if (text.trim()) item.note = text;
    else delete item.note;
    save();
  }

  function renderCartPage() {
    var list = document.getElementById('cartList');
    var empty = document.getElementById('cartEmpty');
    var summary = document.getElementById('cartSummary');
    if (!list || !empty || !summary) return;

    if (items.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      summary.style.display = 'none';
      return;
    }
    list.style.display = 'block';
    empty.style.display = 'none';
    summary.style.display = 'block';

    var pickupBanner = needsPickupOnly()
      ? '<div style="margin-bottom:12px;padding:10px 14px;background:#fff5f5;border:1px solid #eb0029;border-radius:10px;font-size:13px;color:#b8001f;font-weight:600">Hinweis: Der Night Deal ist nur für Abholer – an der Kasse ist nur Abholung möglich (ohne Liefergebühr).</div>'
      : '';

    list.innerHTML = pickupBanner + items.map(function(item) {
      var nameHtml = item.size ? escapeHtml(item.name) + ' <small>(' + escapeHtml(item.size.label) + ')</small>' : escapeHtml(item.name);
      var extrasHtml = '';
      if (item.extras && item.extras.length) {
        extrasHtml = '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">' + item.extras.map(function(e) {
          return '<span style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #22c55e;color:#15803d;border-radius:20px;padding:2px 6px 2px 10px;font-size:12px;font-weight:600">+ ' + escapeHtml(e.name) + ' <button type="button" class="co-extra-x" data-key="' + escapeHtml(item._key) + '" data-extra="' + escapeHtml(e.name) + '" title="Extra entfernen" style="border:none;background:#16a34a;color:#fff;border-radius:50%;width:18px;height:18px;line-height:16px;font-size:12px;cursor:pointer;padding:0">×</button></span>';
        }).join('') + '</div>';
      }
      var noteVal = item.note ? escapeHtml(item.note) : '';
      var noteHtml = '<input type="text" class="co-note" data-key="' + escapeHtml(item._key) + '" value="' + noteVal + '" maxlength="200" placeholder="Anmerkung zu diesem Artikel…" style="margin-top:6px;width:100%;max-width:280px;padding:6px 10px;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;background:#fffdf7">';
      return '<div class="cart-item">' +
        '<div class="cart-item-image"><i class="fas fa-utensils"></i></div>' +
        '<div class="cart-item-info"><h4>' + nameHtml + '</h4>' + extrasHtml + noteHtml + '</div>' +
        '<div class="cart-item-qty">' +
          '<button onclick="Cart.updateQty(\'' + item._key + '\', ' + (item.qty - 1) + ')">−</button>' +
          '<span>' + item.qty + '</span>' +
          '<button onclick="Cart.updateQty(\'' + item._key + '\', ' + (item.qty + 1) + ')">+</button>' +
        '</div>' +
        '<div class="cart-item-total">' + formatEUR(item.price * item.qty) + '</div>' +
        '<button class="cart-item-remove" onclick="Cart.removeItem(\'' + item._key + '\')"><i class="fas fa-times"></i></button>' +
      '</div>';
    }).join('');

    updateSummary();
  }

  function updateSummary() {
    var sub = getSubtotal();
    var fee = getDeliveryFee(sub);
    var total = getTotal();

    document.getElementById('cartSubtotal').textContent = formatEUR(sub);
    var feeRow = document.getElementById('cartDeliveryRow');
    if (feeRow) feeRow.style.display = orderType === 'abholung' ? 'none' : '';
    document.getElementById('cartDelivery').textContent = fee === 0 ? 'Kostenfrei' : formatEUR(fee);
    document.getElementById('cartTotal').textContent = formatEUR(total);

    var discRow = document.getElementById('discountRow');
    var discEl = document.getElementById('cartDiscount');
    if (discount.value > 0 && discRow && discEl) {
      discRow.style.display = 'flex';
      discEl.textContent = '−' + formatEUR(discount.value);
    } else if (discRow) {
      discRow.style.display = 'none';
    }
  }

  function renderCheckoutSummary() {
    var container = document.getElementById('checkoutItems');
    if (!container) return;

    applyPickupRules();
    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Warenkorb ist leer</p>';
      return;
    }

    container.innerHTML = items.map(function(item) {
      var nameHtml = item.size ? escapeHtml(item.name) + ' (' + escapeHtml(item.size.label) + ')' : escapeHtml(item.name);
      if (item.extras && item.extras.length) {
        var exNames = item.extras.map(function(e) { return escapeHtml(e.name); }).join(', ');
        nameHtml += '<br><small style="color:#7a7879">+ ' + exNames + '</small>';
      }
      if (item.note) {
        nameHtml += '<br><small style="color:#8a6d00">Notiz: ' + escapeHtml(item.note) + '</small>';
      }
      return '<div class="checkout-item">' +
        '<div><span class="checkout-item-name">' + nameHtml + '</span><br><span class="checkout-item-qty">' + item.qty + ' × ' + item.price.toFixed(2).replace('.',',') + ' €</span></div>' +
        '<span>' + formatEUR(item.price * item.qty) + '</span>' +
      '</div>';
    }).join('');

    var sub = getSubtotal();
    var fee = getDeliveryFee(sub);
    var total = getTotal();

    document.getElementById('checkoutSubtotal').textContent = formatEUR(sub);
    var coFeeRow = document.getElementById('checkoutDeliveryRow');
    if (coFeeRow) coFeeRow.style.display = orderType === 'abholung' ? 'none' : '';
    document.getElementById('checkoutDelivery').textContent = fee === 0 ? 'Kostenfrei' : formatEUR(fee);
    document.getElementById('checkoutTotal').textContent = formatEUR(total);

    var discRow = document.getElementById('checkoutDiscountRow');
    var discEl = document.getElementById('checkoutDiscount');
    if (discount.value > 0 && discRow && discEl) {
      discRow.style.display = 'flex';
      discEl.textContent = '−' + formatEUR(discount.value);
    } else if (discRow) {
      discRow.style.display = 'none';
    }
  }

  // Expose methods
  return {
    init: init,
    addItem: addItem,
    removeItem: removeItem,
    removeExtra: removeExtra,
    setItemNote: setItemNote,
    updateQty: updateQty,
    getSubtotal: getSubtotal,
    getDeliveryFee: getDeliveryFee,
    getTotal: getTotal,
    getItems: function() { return items; },
    getOrderType: getOrderType,
    setOrderType: setOrderType,
    needsPickupOnly: needsPickupOnly,
    applyPickupRules: applyPickupRules,
    isValidPhone: isValidPhone,
    getDiscount: function() { return discount; },
    applyDiscount: applyDiscount,
    clearDiscount: clearDiscount,
    renderCartPage: renderCartPage,
    renderCheckoutSummary: renderCheckoutSummary
  };
})();

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', function() {
  Cart.init();

  // Coupon code
  var applyBtn = document.getElementById('applyCoupon');
  var couponInput = document.getElementById('couponCode');
  var couponMsg = document.getElementById('couponMessage');
  if (applyBtn && couponInput && couponMsg) {
    applyBtn.addEventListener('click', function() {
      var code = couponInput.value.trim().toUpperCase();
      if (!code) return;
      var result = Cart.applyDiscount(code);
      couponMsg.textContent = result.message;
      couponMsg.className = 'coupon-message ' + (result.valid ? 'success' : 'error');
      if (result.valid) Cart.renderCartPage();
    });
  }

  // Checkout form
  var checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    Cart.renderCheckoutSummary();

    checkoutForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var items = Cart.getItems();
      if (items.length === 0) { alert('Ihr Warenkorb ist leer.'); return; }

      var formData = new FormData(checkoutForm);

      if (!Cart.isValidPhone(formData.get('phone'))) {
        alert('Bitte geben Sie eine gültige Telefonnummer an (z. B. 0151 23456789).');
        var phoneInput = document.getElementById('phone');
        if (phoneInput) { phoneInput.style.borderColor = '#eb0029'; phoneInput.focus(); }
        return;
      }

      var data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        zip: formData.get('zip'),
        notes: formData.get('notes'),
        payment: formData.get('payment'),
        orderType: Cart.getOrderType(),
        items: items.map(function(i) { return { id: i.id, name: i.name, price: i.price, qty: i.qty, size: i.size, extras: (i.extras || []).map(function(e) { return e.name; }), note: i.note || '' }; }),
        subtotal: Cart.getSubtotal(),
        delivery_fee: Cart.getDeliveryFee(Cart.getSubtotal()),
        discount: Cart.getDiscount().value,
        discount_code: Cart.getDiscount().code,
        total: Cart.getTotal()
      };

      var submitBtn = document.getElementById('submitOrder');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wird gesendet...'; }

      fetch('/bestellung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': cartCsrfToken },
        body: JSON.stringify(data)
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.success) {
          localStorage.removeItem('feinCart');
          localStorage.removeItem('feinDiscount');
          window.location.href = '/bestellung/bestellung/' + result.orderNumber;
        } else {
          alert(result.message || 'Fehler bei der Bestellung');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-check"></i> Bestellung aufgeben'; }
        }
      })
      .catch(function() {
        alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-check"></i> Bestellung aufgeben'; }
      });
    });
  }
});
