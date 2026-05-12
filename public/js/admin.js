// Modal functions
function openModal(id) {
  var modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}
function closeModal(id) {
  var modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}
// Close modals on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// Edit product
function editProduct(product) {
  document.getElementById('edit_name').value = product.name;
  document.getElementById('edit_category_id').value = product.category_id || '';
  document.getElementById('edit_price').value = product.price;
  document.getElementById('edit_old_price').value = product.old_price || '';
  document.getElementById('edit_description').value = product.description || '';
  document.getElementById('edit_ingredients').value = product.ingredients || '';
  document.getElementById('edit_sort_order').value = product.sort_order || 0;
  document.getElementById('edit_is_featured').checked = product.is_featured == 1;
  document.getElementById('edit_is_available').checked = product.is_available == 1;
  document.getElementById('editProductForm').action = '/admin/produkte/bearbeiten/' + product.id;
  openModal('editProductModal');
}

// Edit category
function editCategory(cat) {
  document.getElementById('cat_name').value = cat.name;
  document.getElementById('cat_description').value = cat.description || '';
  document.getElementById('cat_sort_order').value = cat.sort_order || 0;
  document.getElementById('cat_active').checked = cat.active == 1;
  document.getElementById('editCategoryForm').action = '/admin/kategorien/bearbeiten/' + cat.id;
  openModal('editCategoryModal');
}

// Sidebar toggle mobile
(function() {
  var toggle = document.getElementById('sidebarToggle');
  var sidebar = document.querySelector('.admin-sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function() {
      sidebar.classList.toggle('active');
    });
  }
})();

// Auto-hide alerts
(function() {
  var alerts = document.querySelectorAll('.alert');
  alerts.forEach(function(a) {
    setTimeout(function() { a.style.opacity = '0'; }, 4000);
    setTimeout(function() { a.style.display = 'none'; }, 4500);
  });
})();
