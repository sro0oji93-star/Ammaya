// Navbar scroll
(function() {
  const header = document.querySelector('.site-header');
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');

  window.addEventListener('scroll', function() {
    if (window.scrollY > 80) {
      if (header) header.classList.add('scrolled');
      if (navbar) navbar.classList.add('scrolled');
    } else {
      if (header) header.classList.remove('scrolled');
      if (navbar) navbar.classList.remove('scrolled');
    }
  });

  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      toggle.classList.toggle('active');
      menu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (navbar && !navbar.contains(e.target)) {
        toggle.classList.remove('active');
        menu.classList.remove('active');
      }
    });
  }
})();

// Counter animation
(function() {
  const counters = document.querySelectorAll('.stat-number');
  if (counters.length === 0) return;

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-target'));
        const isFloat = target % 1 !== 0;
        const duration = 2000;
        const start = performance.now();

        function animate(time) {
          const elapsed = time - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;
          el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
          if (progress < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function(c) { observer.observe(c); });
})();

// Menu filter
(function() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length === 0) return;

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      const categories = document.querySelectorAll('.menu-category');

      if (filter === 'all') {
        categories.forEach(function(c) { c.style.display = 'block'; });
      } else {
        categories.forEach(function(c) {
          c.style.display = c.getAttribute('data-category') === filter ? 'block' : 'none';
        });
      }
    });
  });
})();

// Quantity selector
(function() {
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const qtyInput = document.getElementById('qtyInput');
  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', function() {
      var val = parseInt(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });
    qtyPlus.addEventListener('click', function() {
      var val = parseInt(qtyInput.value) || 1;
      if (val < 20) qtyInput.value = val + 1;
    });
  }
})();

// Banner slider auto-scroll
(function() {
  const slider = document.getElementById('bannerSlider');
  if (!slider) return;
  const slides = slider.querySelectorAll('.banner-slide');
  if (slides.length <= 1) return;
  let current = 0;
  slides.forEach(function(s, i) {
    if (i !== 0) s.style.display = 'none';
  });
  setInterval(function() {
    slides[current].style.display = 'none';
    current = (current + 1) % slides.length;
    slides[current].style.display = 'block';
    slides[current].style.animation = 'fadeInUp .5s ease-out';
  }, 5000);
})();
