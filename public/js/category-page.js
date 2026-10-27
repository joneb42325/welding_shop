import { createProductCard, loadCategories } from './script.js';
import { updateCartUI } from './cart.js';

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 16;

async function init() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('categoryId');

  if (!categoryId) return;

  await Promise.all([loadCategoryTitle(categoryId), loadCategoryProducts(categoryId)]);

  if (allProducts.length > 0) {
    buildFilters();
    setupUIHandlers();
    applyFiltersAndSort();
  }

  updateCartUI();
}

async function loadCategoryTitle(categoryId) {
  const header = document.querySelector('.category-header');
  const categoryTitle = document.getElementById('category-title');
  const diamTitle = document.getElementById('diameter-filter-title');

  if (!categoryTitle || !categoryId) return;

  try {
    const res = await fetch(`/categories/${categoryId}/info`);
    const category = await res.json();

    document.title = `${category.name} — Купити в Wolfram Shop`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = `Каталог продукції у категорії ${category.name}. Великий вибір зварювальних матеріалів за найкращими цінами.`;
    }

    categoryTitle.textContent = category.name;

    if (diamTitle) {
      const nameLower = category.name.toLowerCase();
      if (nameLower.includes('прут')) {
        diamTitle.textContent = 'Діаметр прутка, мм';
      } else if (nameLower.includes('дріт')) {
        diamTitle.textContent = 'Діаметр дроту, мм';
      } else {
        diamTitle.textContent = 'Діаметр, мм';
      }
    }

    const bgUrl = category.image.startsWith('http') ? category.image : `images/${category.image}`;
    header.style.backgroundImage = `url('${bgUrl}')`;
  } catch (err) {
    console.error('Error loading category info', err);
  }
}

async function loadCategoryProducts(categoryId) {
  const categorySection = document.querySelector('.category-products');

  try {
    const res = await fetch(`/products/category/${categoryId}`);
    allProducts = await res.json();

    const oldWrapper = document.querySelector('.empty-state-wrapper');
    if (oldWrapper) oldWrapper.remove();

    if (allProducts.length === 0) {
      const emptyWrapper = document.createElement('div');
      emptyWrapper.className = 'empty-state-wrapper';
      emptyWrapper.innerHTML = `
        <div class="empty-message">
          <h2>У цій категорії поки немає товарів 😔</h2>
          <p>Ми вже працюємо над її наповненням. Загляньте сюди трохи пізніше!</p>
          <a href="/index.html" class="btn-back">Повернутися на головну</a>
        </div>
      `;
      categorySection.appendChild(emptyWrapper);
    }
  } catch (err) {
    console.error('Error loading products', err);
  }
}

function buildFilters() {
  const brandsContainer = document.getElementById('filter-brands');
  const diametersContainer = document.getElementById('filter-diameters');

  if (!brandsContainer || !diametersContainer) return;

  const brands = [...new Set(allProducts.map((p) => p.manufacturer_name).filter(Boolean))].sort();
  const diameters = [...new Set(allProducts.map((p) => p.diameter).filter(Boolean))].sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  );

  brandsContainer.innerHTML = brands
    .map(
      (b) => `
    <label class="custom-checkbox">
      <input type="checkbox" value="${b}" class="filter-brand">
      <span>${b}</span>
    </label>
  `
    )
    .join('');

  diametersContainer.innerHTML = diameters
    .map(
      (d) => `
    <label class="custom-checkbox">
      <input type="checkbox" value="${d}" class="filter-diam">
      <span>${d}</span>
    </label>
  `
    )
    .join('');
}

function applyFiltersAndSort() {
  const inStockOnly = document.getElementById('filter-instock')?.checked;
  const selectedBrands = Array.from(document.querySelectorAll('.filter-brand:checked')).map(
    (cb) => cb.value
  );
  const selectedDiams = Array.from(document.querySelectorAll('.filter-diam:checked')).map(
    (cb) => cb.value
  );
  const sortVal = document.getElementById('sort-select')?.value || 'default';

  filteredProducts = allProducts.filter((p) => {
    if (inStockOnly && p.total_stock <= 0) return false;
    if (selectedBrands.length > 0 && !selectedBrands.includes(p.manufacturer_name)) return false;
    if (selectedDiams.length > 0 && !selectedDiams.includes(p.diameter)) return false;
    return true;
  });

  if (sortVal === 'price-asc') {
    filteredProducts.sort((a, b) => (a.price_retail || 0) - (b.price_retail || 0));
  } else if (sortVal === 'price-desc') {
    filteredProducts.sort((a, b) => (b.price_retail || 0) - (a.price_retail || 0));
  }

  currentPage = 1;
  renderProductsChunk(false);
}

function renderProductsChunk(append = false) {
  const container = document.getElementById('category-products-container');
  if (!container) return;

  if (!append) container.innerHTML = '';

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const chunk = filteredProducts.slice(startIndex, endIndex);

  if (filteredProducts.length === 0 && !append) {
    container.innerHTML = `<div class="no-results-box" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><p class="no-results-title">Товарів за вашим запитом не знайдено</p></div>`;
  } else {
    chunk.forEach((product, index) => {
      const isEager = !append && index < 4;
      container.appendChild(createProductCard(product, isEager));
    });
  }

  updatePaginationUI();
}

function updatePaginationUI() {
  const controls = document.getElementById('pagination-controls');
  const counter = document.getElementById('products-counter');
  const loadBtn = document.getElementById('load-more-btn');

  if (!controls) return;

  const visibleCount = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  if (filteredProducts.length > 0) {
    controls.style.display = 'block';
    counter.textContent = `Відображено ${visibleCount} з ${filteredProducts.length}`;

    if (visibleCount >= filteredProducts.length) {
      loadBtn.style.display = 'none';
    } else {
      loadBtn.style.display = 'inline-block';
    }
  } else {
    controls.style.display = 'none';
  }
}

function setupUIHandlers() {
  // Автоматическое применение фильтров при выборе чекбокса
  document.querySelector('.filter-sidebar')?.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') applyFiltersAndSort();
  });

  document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

  document.getElementById('per-page-select')?.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value, 10);
    applyFiltersAndSort();
  });

  document.getElementById('load-more-btn')?.addEventListener('click', () => {
    currentPage++;
    renderProductsChunk(true);
  });

  document.getElementById('reset-filters')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach((cb) => {
      cb.checked = cb.id === 'filter-instock';
    });
    applyFiltersAndSort();
  });

  // Логика Модального окна
  const filterSidebar = document.getElementById('filter-sidebar');
  const filterOverlay = document.getElementById('filter-overlay');

  function openFilterModal() {
    if (filterSidebar) filterSidebar.style.display = 'block';
    if (filterOverlay) filterOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeFilterModal() {
    if (filterSidebar) filterSidebar.style.display = 'none';
    if (filterOverlay) filterOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.getElementById('mobile-filter-btn')?.addEventListener('click', openFilterModal);
  document.getElementById('close-filter-btn')?.addEventListener('click', closeFilterModal);
  document.getElementById('apply-filters-btn')?.addEventListener('click', closeFilterModal);
  filterOverlay?.addEventListener('click', closeFilterModal);

  // Аккордеоны внутри фильтра
  document.querySelectorAll('.filter-group-header').forEach((header) => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('active');
    });
  });
}

init();
