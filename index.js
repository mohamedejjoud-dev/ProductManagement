const productForm = document.getElementById('productForm');
const titleInput = document.getElementById('title');
const priceInput = document.getElementById('price');
const discountInput = document.getElementById('discount');
const totalValue = document.getElementById('totalValue');
const countInput = document.getElementById('count');
const countGroup = document.getElementById('countGroup');
const categoryInput = document.getElementById('category');
const submitBtn = document.getElementById('submitBtn');
const formTitle = document.getElementById('formTitle');
const statCount = document.getElementById('statCount');
const searchInput = document.getElementById('search');
const pillTitle = document.getElementById('pillTitle');
const pillCategory = document.getElementById('pillCategory');
const pillClear = document.getElementById('pillClear');
const tbody = document.getElementById('tbody');
const emptyState = document.getElementById('emptyState');
const deleteAllBtn = document.getElementById('deleteAllBtn');

const STORAGE_KEY = 'products';
let products = loadProducts();
let editingId = null;
let filterBy = 'title';

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('product');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((p, index) => ({
      id: Number(p.id) || (index + 1),
      title: String(p.title || '').trim(),
      price: Math.max(0, Number(p.price) || 0),
      discount: Math.max(0, Number(p.discount) || 0),
      total: Math.max(0, Number(p.total) || 0),
      category: String(p.category || '').trim()
    }));
  } catch {
    return [];
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function getNextId() {
  if (products.length === 0) return 1;
  return products.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
}

function formatNumber(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function calculateTotal() {
  const price = parseFloat(priceInput.value);
  const discount = parseFloat(discountInput.value) || 0;

  if (isNaN(price) && !discountInput.value) {
    totalValue.textContent = '—';
    return 0;
  }

  const validPrice = isNaN(price) ? 0 : price;
  const total = Math.max(0, Math.round((validPrice - discount) * 100) / 100);
  totalValue.textContent = formatNumber(total);
  return total;
}

function getFilteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  pillClear.classList.toggle('hidden', query.length === 0);

  if (!query) return products;

  return products.filter(product => {
    const field = filterBy === 'title' ? product.title : product.category;
    return (field || '').toLowerCase().includes(query);
  });
}

function renderProducts() {
  const list = getFilteredProducts();

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    const msg = emptyState.querySelector('p');
    if (msg) {
      msg.textContent = products.length === 0
        ? 'No products yet. Create one above.'
        : 'No matching products found.';
    }
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${escapeHtml(p.title)}</td>
        <td class="text-right">${formatNumber(p.price)}</td>
        <td class="text-right">${formatNumber(p.discount)}</td>
        <td class="text-right">${formatNumber(p.total)}</td>
        <td>${escapeHtml(p.category || '—')}</td>
        <td class="text-right">
          <button type="button" class="action-btn btn-edit" data-id="${p.id}">Edit</button>
          <button type="button" class="action-btn btn-delete" data-id="${p.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  const count = products.length;
  statCount.textContent = `${count} ${count === 1 ? 'product' : 'products'}`;
  deleteAllBtn.classList.toggle('hidden', count === 0);
}

function startEdit(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  editingId = id;
  titleInput.value = product.title;
  priceInput.value = product.price;
  discountInput.value = product.discount;
  categoryInput.value = product.category || '';
  calculateTotal();

  formTitle.textContent = `Edit Product #${product.id}`;
  submitBtn.textContent = 'Save Changes';
  submitBtn.className = 'btn btn-update';
  countGroup.classList.add('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  productForm.reset();
  formTitle.textContent = 'New Product';
  submitBtn.textContent = 'Create Product';
  submitBtn.className = 'btn btn-primary';
  countGroup.classList.remove('hidden');
  totalValue.textContent = '—';
}

function handleSubmit(e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  const price = parseFloat(priceInput.value);
  const discount = parseFloat(discountInput.value) || 0;
  const category = categoryInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  if (isNaN(price) || price < 0) {
    priceInput.focus();
    return;
  }

  if (discount < 0 || discount > price) {
    discountInput.focus();
    alert('Discount cannot exceed the price');
    return;
  }

  const total = Math.max(0, Math.round((price - discount) * 100) / 100);

  if (editingId !== null) {
    const product = products.find(p => p.id === editingId);
    if (product) {
      product.title = title;
      product.price = price;
      product.discount = discount;
      product.total = total;
      product.category = category;
    }
    resetForm();
  } else {
    const quantity = Math.min(Math.max(1, parseInt(countInput.value, 10) || 1), 500);
    let startId = getNextId();
    for (let i = 0; i < quantity; i++) {
      products.push({
        id: startId++,
        title,
        price,
        discount,
        total,
        category
      });
    }
    resetForm();
  }

  saveProducts();
  renderProducts();
}

function deleteProduct(id) {
  const target = products.find(p => p.id === id);
  if (!target) return;

  if (!confirm(`Delete "${target.title}"?`)) return;

  if (editingId === id) resetForm();

  products = products.filter(p => p.id !== id);
  saveProducts();
  renderProducts();
}

function deleteAll() {
  if (products.length === 0) return;
  if (!confirm(`Delete all ${products.length} products?`)) return;

  products = [];
  resetForm();
  saveProducts();
  renderProducts();
}

productForm.addEventListener('submit', handleSubmit);
productForm.addEventListener('reset', resetForm);
priceInput.addEventListener('input', calculateTotal);
discountInput.addEventListener('input', calculateTotal);
searchInput.addEventListener('input', renderProducts);

pillTitle.addEventListener('click', () => {
  filterBy = 'title';
  pillTitle.classList.add('active');
  pillCategory.classList.remove('active');
  renderProducts();
  searchInput.focus();
});

pillCategory.addEventListener('click', () => {
  filterBy = 'category';
  pillCategory.classList.add('active');
  pillTitle.classList.remove('active');
  renderProducts();
  searchInput.focus();
});

pillClear.addEventListener('click', () => {
  searchInput.value = '';
  renderProducts();
  searchInput.focus();
});

deleteAllBtn.addEventListener('click', deleteAll);

tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.classList.contains('btn-edit')) startEdit(id);
  if (btn.classList.contains('btn-delete')) deleteProduct(id);
});

renderProducts();
