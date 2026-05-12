/* Cart Module */
var Cart = (function() {
  var items = [];
  var discount = { code: null, value: 0 };
  var settings = window.restaurantSettings || { delivery_fee: 4.50, free_delivery_from: 40.00 };

  function init() {
    load();
    renderCartBadge();
    bindAddToCart();
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  function load() {
    try {
      var data = localStorage.getItem('feinCart');
      if (data) items = JSON.parse(data);
      var disc = localStorage.getItem('feinDiscount');
      if (disc) discount = JSON.parse(disc);
    } catch(e) { items = []; }
  }

  function save() {
    localStorage.setItem('feinCart', JSON.stringify(items));
    localStorage.setItem('feinDiscount', JSON.stringify(discount));
  }

  function addItem(id, name, price, qty) {
    qty = qty || 1;
    var existing = items.find(function(i) { return i.id == id; });
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id: id, name: name, price: parseFloat(price), qty: qty });
    }
    save();
    renderCartBadge();
    showToast('"'+ name +'" zum Warenkorb hinzugefügt!');
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  function removeItem(id) {
    items = items.filter(function(i) { return i.id != id; });
    save();
    renderCartBadge();
    if (document.getElementById('cartList')) renderCartPage();
    if (document.getElementById('checkoutItems')) renderCheckoutSummary();
  }

  function updateQty(id, qty) {
    var item = items.find(function(i) { return i.id == id; });
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
    var badge = document.getElementById('cartBadge');
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

  function bindAddToCart() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');
      var price = btn.getAttribute('data-price');
      var qtyInput = document.getElementById('qtyInput');
      var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      addItem(id, name, price, qty);
      if (qtyInput) qtyInput.value = 1;
    });
  }

  function formatEUR(amount) {
    return amount.toFixed(2).replace('.', ',') + ' €';
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

    list.innerHTML = items.map(function(item) {
      return '<div class="cart-item">' +
        '<div class="cart-item-image"><i class="fas fa-utensils"></i></div>' +
        '<div class="cart-item-info"><h4>' + item.name + '</h4><p>' + item.price.toFixed(2).replace('.',',') + ' €</p></div>' +
        '<div class="cart-item-qty">' +
          '<button onclick="Cart.updateQty(' + item.id + ', ' + (item.qty - 1) + ')">−</button>' +
          '<span>' + item.qty + '</span>' +
          '<button onclick="Cart.updateQty(' + item.id + ', ' + (item.qty + 1) + ')">+</button>' +
        '</div>' +
        '<div class="cart-item-total">' + formatEUR(item.price * item.qty) + '</div>' +
        '<button class="cart-item-remove" onclick="Cart.removeItem(' + item.id + ')"><i class="fas fa-times"></i></button>' +
      '</div>';
    }).join('');

    updateSummary();
  }

  function updateSummary() {
    var sub = getSubtotal();
    var fee = getDeliveryFee(sub);
    var total = getTotal();

    document.getElementById('cartSubtotal').textContent = formatEUR(sub);
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

    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Warenkorb ist leer</p>';
      return;
    }

    container.innerHTML = items.map(function(item) {
      return '<div class="checkout-item">' +
        '<div><span class="checkout-item-name">' + item.name + '</span><br><span class="checkout-item-qty">' + item.qty + ' × ' + item.price.toFixed(2).replace('.',',') + ' €</span></div>' +
        '<span>' + formatEUR(item.price * item.qty) + '</span>' +
      '</div>';
    }).join('');

    var sub = getSubtotal();
    var fee = getDeliveryFee(sub);
    var total = getTotal();

    document.getElementById('checkoutSubtotal').textContent = formatEUR(sub);
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
    updateQty: updateQty,
    getSubtotal: getSubtotal,
    getDeliveryFee: getDeliveryFee,
    getTotal: getTotal,
    getItems: function() { return items; },
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
      var data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        zip: formData.get('zip'),
        notes: formData.get('notes'),
        payment: formData.get('payment'),
        items: items,
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
        headers: { 'Content-Type': 'application/json' },
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
