import { injectHeader, injectFooter, injectSidebar } from './layouts.js';
import { createProductCard, loadCategories } from './script.js';
import { updateCartUI } from './cart.js';

injectHeader();
injectSidebar();
injectFooter();

updateCartUI();
loadCategories();

const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('q') || '';

const titleElement = document.getElementById('search-title');
const container = document.getElementById('search-results-container');
const sortContainer = document.getElementById('sort-container');
const sortSelect = document.getElementById('search-sort');

let currentProducts = [];

if (query && titleElement) {
  titleElement.textContent = `Результати пошуку за запитом: "${query}"`;
}

function renderProducts(products) {
  if (!container) return;
  container.innerHTML = '';

  products.forEach((product) => {
    container.appendChild(createProductCard(product));
  });
}

function sortAndRender() {
  const sortValue = sortSelect.value;

  let sorted = [...currentProducts];

  if (sortValue === 'price-asc') {
    sorted.sort((a, b) => (a.price_retail || 0) - (b.price_retail || 0));
  } else if (sortValue === 'price-desc') {
    sorted.sort((a, b) => (b.price_retail || 0) - (a.price_retail || 0));
  }

  sorted.sort((a, b) => {
    const aAvailable = (a.total_stock || 0) > 0 ? 1 : 0;
    const bAvailable = (b.total_stock || 0) > 0 ? 1 : 0;

    return bAvailable - aAvailable;
  });

  renderProducts(sorted);
}

if (sortSelect) {
  sortSelect.addEventListener('change', sortAndRender);
}

async function performSearch() {
  if (!container) return;

  if (!query.trim()) {
    container.innerHTML =
      '<p class="search-empty-msg">Пошуковий запит порожній. Введіть щось у пошук 🔍</p>';
    return;
  }
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    currentProducts = await res.json();

    container.innerHTML = '';

    if (currentProducts.length === 0) {
      if (sortContainer) sortContainer.style.display = 'none';
      container.innerHTML = `
        <div class="no-results-box">
          <p class="no-results-title">Нічого не знайдено за запитом "<strong>${query}</strong>" 🔍</p>
          <p class="no-results-hint">Перевірте правильність написання або спробуйте інші слова (наприклад: дріт, електроди).</p>
        </div>
      `;
      return;
    }

    if (titleElement) {
      titleElement.textContent = `Результати пошуку за запитом: "${query}" (${currentProducts.length})`;
    }

    if (sortContainer) {
      sortContainer.style.display = 'flex';
    }

    sortAndRender();
  } catch (error) {
    console.error('Помилка при роботі сторінки пошуку:', err);
    container.innerHTML =
      '<p class="search-error-msg">Cталася помилка при завантаженні результатів пошуку. Спробуйте пізніше.</p>';
  }
}

performSearch();
