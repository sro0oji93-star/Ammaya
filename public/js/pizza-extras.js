/* Pizza Extras & Beläge – zeigt Preise je nach gewählter Größe an.
   Erwartet window.PIZZA_EXTRA_PRICES = { "<sizeLabel>": { belag, fisch, kaeserand } } */
(function() {
  function sizeLabelFor(productId) {
    var radio = document.querySelector('input[name="size_' + productId + '"]:checked');
    if (!radio) radio = document.querySelector('input[name="detailSize"]:checked');
    return radio ? radio.getAttribute('data-label') : null;
  }

  function fmt(n) {
    return '+' + n.toFixed(2).replace('.', ',') + ' €';
  }

  function refreshBox(box) {
    var pid = box.getAttribute('data-extras-for');
    var label = sizeLabelFor(pid);
    var tiers = window.PIZZA_EXTRA_PRICES || {};
    var tier = label ? tiers[label] : null;
    var boxes = box.querySelectorAll('input[type="checkbox"][data-extra-name]');
    for (var i = 0; i < boxes.length; i++) {
      (function(cb) {
        var type = cb.getAttribute('data-extra-type');
        var span = cb.closest('label').querySelector('.extra-price');
        var p = tier ? tier[type] : null;
        if (p == null || isNaN(parseFloat(p))) {
          if (span) span.textContent = '';
          cb.setAttribute('data-extra-price', '');
        } else {
          var num = parseFloat(p);
          if (span) span.textContent = fmt(num);
          cb.setAttribute('data-extra-price', num.toFixed(2));
        }
      })(boxes[i]);
    }
  }

  function refreshAll() {
    var all = document.querySelectorAll('[data-extras-for]');
    for (var i = 0; i < all.length; i++) refreshBox(all[i]);
  }

  document.addEventListener('change', function(e) {
    if (e.target && e.target.matches && e.target.matches('input[name^="size_"], input[name="detailSize"]')) {
      refreshAll();
    }
  });
  document.addEventListener('DOMContentLoaded', refreshAll);
  refreshAll();
  window.refreshPizzaExtras = refreshAll;
})();
