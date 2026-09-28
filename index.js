/* ============================================================
   ProductVault — index.js
   ============================================================ */

// ── DOM refs ────────────────────────────────────────────────
const titleEl    = document.getElementById('title');
const priceEl    = document.getElementById('price');
const discountEl = document.getElementById('discount');
const totalValue = document.getElementById('totalValue');
const countEl    = document.getElementById('count');
const categoryEl = document.getElementById('category');
const submitBtn  = document.getElementById('submitBtn');
const resetBtn   = document.getElementById('resetBtn');
const formTitle  = document.getElementById('formTitle');
const statCount    = document.getElementById('statCount');
const searchEl     = document.getElementById('search');
const tbody        = document.getElementById('tbody');
const emptyState   = document.getElementById('emptyState');
const pillClear    = document.getElementById('pillClear');
const deleteAllBtn = document.getElementById('deleteAllBtn');

// ── State ────────────────────────────────────────────────────
// FIX #3: Safe localStorage parse — corrupted data won't crash the app
function safeLoadProducts() {
  try {
    const raw = localStorage.getItem('product');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[ProductVault] localStorage data was corrupted, resetting.', e);
    localStorage.removeItem('product');
    return [];
  }
}
let dataPro   = safeLoadProducts();
let mode      = 'create';   // 'create' | 'update'
let editIndex = -1;
let filterBy  = 'title';    // 'title' | 'category'

// ── Calc total ───────────────────────────────────────────────
function calcTotal() {
  const p = parseFloat(priceEl.value)    || 0;
  const d = parseFloat(discountEl.value) || 0;
  const result = p - d;
  totalValue.textContent = (p === 0 && d === 0) ? '—' : `$${result.toFixed(2)}`;
}

// ── Save to localStorage ─────────────────────────────────────
function save() {
  localStorage.setItem('product', JSON.stringify(dataPro));
}

// ── Render table ─────────────────────────────────────────────
// list: optional pre-filtered array where each item already has ._idx
// If omitted, renders the full dataPro array.
function showData(list) {
  // When rendering the full list, tag each item with its real index
  const rows = list ?? dataPro.map((p, i) => ({ ...p, _idx: i }));

  // empty state
  if (rows.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = rows.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(p.title)}</td>
        <td>$${parseFloat(p.price).toFixed(2)}</td>
        <td>${parseFloat(p.discount).toFixed(2)}%</td>
        <td style="color:var(--emerald);font-weight:600">$${parseFloat(p.total).toFixed(2)}</td>
        <td>${escHtml(p.category)}</td>
        <td>
          <button class="action-btn btn-edit"   onclick="startEdit(${p._idx})">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="action-btn btn-delete" onclick="deleteData(${p._idx})">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  }

  // header count always reflects full list size
  const n = dataPro.length;
  statCount.textContent = `${n} ${n === 1 ? 'product' : 'products'}`;
  // show Delete All only when there are products
  deleteAllBtn.classList.toggle('hidden', n === 0);
}

// ── Escape HTML ───────────────────────────────────────────────
// FIX #10: Also escape single-quotes for full attribute safety
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}

// ── Submit (create / update) ──────────────────────────────────
const LIMITS = {
  titleMaxLen:    120,   // matches maxlength in HTML (#1)
  categoryMaxLen: 60,
  priceMax:       1_000_000,  // FIX #5: prevent absurd floats
  countMax:       500,         // FIX #2: prevent browser freeze
};

function submitProduct() {
  const titleVal    = titleEl.value.trim();
  const priceVal    = parseFloat(priceEl.value);
  const discountVal = parseFloat(discountEl.value) || 0;
  const countVal    = parseInt(countEl.value)      || 1;
  const categoryVal = categoryEl.value.trim();

  // ── Validation ─────────────────────────────────────────────
  if (!titleVal)
    return shake(titleEl,    'Title is required');
  if (titleVal.length > LIMITS.titleMaxLen)                   // FIX #1
    return shake(titleEl,    `Title must be ≤ ${LIMITS.titleMaxLen} characters`);
  if (isNaN(priceVal) || priceVal < 0)
    return shake(priceEl,    'Enter a valid price (≥ 0)');
  if (priceVal > LIMITS.priceMax)                             // FIX #5
    return shake(priceEl,    `Price must be ≤ ${LIMITS.priceMax.toLocaleString()}`);
  if (discountVal < 0)                                        // FIX #4
    return shake(discountEl, 'Discount cannot be negative');
  if (discountVal > priceVal)                                 // FIX #4
    return shake(discountEl, 'Discount cannot exceed the price');
  if (mode === 'create' && countVal < 1)
    return shake(countEl,    'Quantity must be ≥ 1');
  if (mode === 'create' && countVal > LIMITS.countMax)        // FIX #2
    return shake(countEl,    `Quantity must be ≤ ${LIMITS.countMax}`);
  if (categoryVal.length > LIMITS.categoryMaxLen)             // FIX #1
    return shake(categoryEl, `Category must be ≤ ${LIMITS.categoryMaxLen} characters`);

  const total = priceVal - discountVal;

  if (mode === 'create') {
    const copies = Math.min(Math.max(1, countVal), LIMITS.countMax);
    for (let i = 0; i < copies; i++) {
      dataPro.push({ title: titleVal, price: priceVal, discount: discountVal, total, category: categoryVal });
    }
  } else {
    // FIX #6: bounds-check editIndex before writing
    if (editIndex < 0 || editIndex >= dataPro.length) {
      console.error('[ProductVault] Invalid editIndex, aborting update.');
      endEdit();
      return;
    }
    dataPro[editIndex] = { title: titleVal, price: priceVal, discount: discountVal, total, category: categoryVal };
    endEdit();
  }

  save();
  clearForm();
  showData();
}

// ── Shake animation for invalid input ────────────────────────
function shake(el, msg) {
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow   = '0 0 0 3px rgba(255,82,82,.15)';
  el.focus();
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 1400);
  console.warn(msg);
}

// ── Reset / clear form ────────────────────────────────────────
function resetForm()  { clearForm(); endEdit(); }

function clearForm() {
  titleEl.value    = '';
  priceEl.value    = '';
  discountEl.value = '';
  countEl.value    = '';
  categoryEl.value = '';
  totalValue.textContent = '—';
}

// ── Delete single ─────────────────────────────────────────────
function deleteData(idx) {
  // FIX #7: bounds-check before splice to avoid array corruption
  if (typeof idx !== 'number' || idx < 0 || idx >= dataPro.length) {
    console.error('[ProductVault] deleteData: invalid index', idx);
    return;
  }
  dataPro.splice(idx, 1);
  save();
  liveSearch();
}

// ── Delete all ────────────────────────────────────────────────
function deleteAll() {
  if (dataPro.length === 0) return;
  if (!confirm(`Delete all ${dataPro.length} products?`)) return;
  dataPro = [];
  localStorage.removeItem('product');
  clearSearch();
  showData();
}

// ── Edit ──────────────────────────────────────────────────────
function startEdit(idx) {
  // FIX #6: guard against undefined / out-of-range index
  if (typeof idx !== 'number' || idx < 0 || idx >= dataPro.length) {
    console.error('[ProductVault] startEdit: invalid index', idx);
    return;
  }
  const p = dataPro[idx];
  titleEl.value    = p.title;
  priceEl.value    = p.price;
  discountEl.value = p.discount;
  categoryEl.value = p.category;
  calcTotal();

  editIndex = idx;
  mode      = 'update';

  formTitle.textContent     = 'Edit Product';
  submitBtn.innerHTML       = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  submitBtn.className       = 'btn btn-update';
  countEl.closest('.field-group').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function endEdit() {
  mode      = 'create';
  editIndex = -1;
  formTitle.textContent = 'New Product';
  submitBtn.innerHTML   = '<i class="fa-solid fa-plus"></i> Create Product';
  submitBtn.className   = 'btn btn-primary';
  countEl.closest('.field-group').style.display = '';
}

// ── Search / filter pills ─────────────────────────────────────
function activatePill(by) {
  filterBy = by;
  document.getElementById('pillTitle').classList.toggle('active',    by === 'title');
  document.getElementById('pillCategory').classList.toggle('active', by === 'category');
  searchEl.placeholder = by === 'title' ? 'Search by title…' : 'Search by category…';
  searchEl.focus();
  liveSearch();
}

function clearSearch() {
  searchEl.value = '';
  pillClear.classList.add('hidden');
  document.getElementById('pillTitle').classList.remove('active');
  document.getElementById('pillCategory').classList.remove('active');
  showData();
}

function liveSearch() {
  const q = searchEl.value.trim().toLowerCase();
  // show/hide the × clear button
  pillClear.classList.toggle('hidden', q.length === 0);
  if (!q) { showData(); return; }

  // Tag each item with its real index before filtering
  const filtered = dataPro
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p =>
      filterBy === 'title'
        ? p.title.toLowerCase().includes(q)
        : p.category.toLowerCase().includes(q)
    );
  showData(filtered);
}

// ── Init ──────────────────────────────────────────────────────
showData();
