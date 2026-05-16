import { addToCart, updateCartUI } from './cart.js';
import { isFavorite, toggleFavorite } from './favorites.js';

const params = new URLSearchParams(window.location.search);
const productId = params.get('productId');

const manufacturerContainer = document.getElementById('manufacturer-tables');
const descriptionSection = document.querySelector('.product-description');
const descriptionElement = document.getElementById('product-description');

let currentProduct = null;

async function initProductPage() {
  if (!productId || !manufacturerContainer) return;

  try {
    // 1. Завантажуємо дані про товар (назва, опис, бренд)
    const productRes = await fetch(`/product/${productId}`);
    if (!productRes.ok) throw new Error('Товар не знайдено');

    currentProduct = await productRes.json();

    // Оновлюємо інтерфейс даними товару
    renderProductInfo(currentProduct);

    // Отрисовуємо таблицю
    renderTable(currentProduct);
  } catch (err) {
    console.error('Помилка завантаження сторінки:', err);
    renderEmptyState(); // Показуємо повідомлення про помилку/пусту сторінку
  }
}

function renderProductInfo(product) {
  const displayName = product.manufacturer_name
    ? `${product.name} ${product.manufacturer_name}`
    : product.name;

  document.title = `${displayName} — Купити в Wolfram Shop`;
  document.getElementById('product-name').textContent = displayName;

  // Опис
  if (product.description && product.description.trim() !== '') {
    descriptionElement.classList.add('product-description-text');
    descriptionElement.textContent = product.description;
    descriptionSection.style.display = 'block';
  } else {
    descriptionSection.style.display = 'none';
  }

  // Зображення
  const productImg = document.getElementById('product-image');
  productImg.src = product.image;
  productImg.alt = `Фото товару: ${displayName}`;

  // Кнопка обраного
  setupFavoriteButton(product.id);
}

function setupFavoriteButton(id) {
  const productInfo = document.querySelector('.product-info');
  const favBtn = document.createElement('div');
  favBtn.className = 'fav-btn';
  favBtn.innerHTML = isFavorite(id) ? '❤️' : '🤍';

  favBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const added = toggleFavorite(id);
    favBtn.innerHTML = added ? '❤️' : '🤍';
    favBtn.style.transform = 'scale(1.2)';
    setTimeout(() => (favBtn.style.transform = 'scale(1)'), 200);
  });

  productInfo.appendChild(favBtn);
}

function renderTable(product) {
  const pricesSection = document.querySelector('.product-prices');
  manufacturerContainer.innerHTML = '';

  if (!product || !product.price_retail) {
    renderEmptyState();
    return;
  }

  pricesSection.classList.remove('is-empty');
  manufacturerContainer.style.display = '';

  const section = document.createElement('div');
  section.classList.add('manufacturer-block');

  section.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Діаметр</th>
          <th>Вага</th>
          <th>Роздріб</th>
          <th>ФОП</th>
          <th>Опт</th>
          <th>Дія</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  const tbody = section.querySelector('tbody');

  const isAvailable = product.stock > 0;
  let selectedType = 'retail';

  const row = document.createElement('tr');
  if (!isAvailable) row.classList.add('out-of-stock-row');

  row.innerHTML = `
      <td>${product.diameter || '-'}</td>
      <td>${product.weight || '-'}</td>
      <td class="price-cell ${isAvailable ? 'active' : ''}" data-type="retail">${product.price_retail} грн</td>
      <td class="price-cell" data-type="company">${product.price_company} грн</td>
      <!--<td class="price-cell" data-type="wholesale">${product.price_wholesale} грн</td> -->
      <td class="wholesale-info">
    <span class="price-val">${product.price_wholesale} грн</span>
    <span class="threshold-text">від ${product.wholesale_threshold} шт</span>
  </td>
      <td>
        <button class="add-to-cart" ${!isAvailable ? 'disabled' : ''}>
          ${isAvailable ? 'В кошик' : 'Немає в наявності'}
        </button>
      </td>
    `;

  if (isAvailable) {
    // Логіка вибору типу ціни
    row.querySelectorAll('.price-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        selectedType = cell.dataset.type;
        row.querySelectorAll('.price-cell').forEach((c) => c.classList.remove('active'));
        cell.classList.add('active');
      });
    });

    // Додавання в кошик
    row.querySelector('.add-to-cart').addEventListener('click', () => {
      const price = product[`price_${selectedType}`];
      showToast(`${currentProduct.name} додано до кошика!`);

      addToCart({
        productId: product.id,
        name: product.name,
        image: product.image,
        manufacturer: product.manufacturer_name || '',
        diameter: product.diameter || '',
        weight: product.weight || '',
        selectedType,
        price,

        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        wholesale_threshold: product.wholesale_threshold,
      });
      updateCartUI();
    });
  }
  tbody.appendChild(row);

  manufacturerContainer.appendChild(section);
}

function renderEmptyState() {
  const pricesSection = document.querySelector('.product-prices');
  manufacturerContainer.style.display = 'none';
  pricesSection.classList.add('is-empty');

  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-state-wrapper';
  emptyDiv.innerHTML = `
    <div class="empty-message">
      <h2>Ціни наразі оновлюються 🛠️</h2>
      <p>Ми вже працюємо над їх наповненням.</p>
      <a href="/index.html" class="btn-back">Повернутися на головну</a>
    </div>
  `;
  pricesSection.appendChild(emptyDiv);
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cursor = 'pointer';
  toast.innerHTML = `
    <span>🛒</span>
    <span>${message}</span>
  `;

  toast.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

initProductPage();
updateCartUI();
