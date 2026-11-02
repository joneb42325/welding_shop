import { createProductCard, initProductCard } from './script.js';
import { updateCartUI } from './cart.js';

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 16;

function init() {
  if (window.INITIAL_CATEGORY) {
    const category = window.INITIAL_CATEGORY;
    const diamTitle = document.getElementById('diameter-filter-title');

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
  }

  if (window.INITIAL_PRODUCTS) {
    allProducts = window.INITIAL_PRODUCTS;
    const categorySection = document.querySelector('.category-products');

    if (allProducts.length === 0 && categorySection) {
      const emptyWrapper = document.createElement('div');
      emptyWrapper.className = 'empty-state-wrapper';
      emptyWrapper.innerHTML = `
        <div class="empty-message">
          <h2>У цій категорії поки немає товарів 😔</h2>
          <p>Ми вже працюємо над її наповненням. Загляньте сюди трохи пізніше!</p>
          <a href="/" class="btn-back">Повернутися на головну</a>
        </div>
      `;
      categorySection.appendChild(emptyWrapper);
    } else {
      buildFilters();
      setupUIHandlers();

      // Початковий стан відповідає SSR (фільтр "Тільки в наявності" увімкнений за замовчуванням)
      filteredProducts = allProducts.filter((p) => Number(p.total_stock) > 0);

      const initialProducts = filteredProducts.slice(0, itemsPerPage);
      const cards = document.querySelectorAll('#category-products-container .product-card');

      cards.forEach((card, index) => {
        if (initialProducts[index]) {
          initProductCard(card, initialProducts[index]);
        }
      });

      updatePaginationUI();
    }
  }

  updateCartUI();
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
    <label class="custom-checkbox"><input type="checkbox" value="${b}" class="filter-brand"><span>${b}</span></label>
  `
    )
    .join('');

  diametersContainer.innerHTML = diameters
    .map(
      (d) => `
    <label class="custom-checkbox"><input type="checkbox" value="${d}" class="filter-diam"><span>${d}</span></label>
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
    if (inStockOnly && Number(p.total_stock) <= 0) return false;
    if (selectedBrands.length > 0 && !selectedBrands.includes(p.manufacturer_name)) return false;
    if (selectedDiams.length > 0 && !selectedDiams.includes(p.diameter)) return false;
    return true;
  });

  if (sortVal === 'price-asc') {
    filteredProducts.sort(
      (a, b) => (parseFloat(a.price_retail) || 0) - (parseFloat(b.price_retail) || 0)
    );
  } else if (sortVal === 'price-desc') {
    filteredProducts.sort(
      (a, b) => (parseFloat(b.price_retail) || 0) - (parseFloat(a.price_retail) || 0)
    );
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
    loadBtn.style.display = visibleCount >= filteredProducts.length ? 'none' : 'inline-block';
  } else {
    controls.style.display = 'none';
  }
}

function setupUIHandlers() {
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

  document.querySelectorAll('.filter-group-header').forEach((header) => {
    header.addEventListener('click', () => header.parentElement.classList.toggle('active'));
  });
}

init();
