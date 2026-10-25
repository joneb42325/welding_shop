import { addToCart, updateCartUI, showToast } from './cart.js';
import { isFavorite, toggleFavorite } from './favorites.js';
import { getOptimizedImg } from './script.js';

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

  const statusHTML =
    product.stock > 0
      ? `<p class="stock-status available">✓ В наявності</p>`
      : `<p class="stock-status out-of-stock">✕ Немає в наявності</p>`;

  const nameEl = document.getElementById('product-name');
  if (nameEl) {
    nameEl.textContent = displayName;
    nameEl.setAttribute('data-clarity-unmask', 'true');

    nameEl.insertAdjacentHTML('afterend', statusHTML);
  }

  const breadcrumbs = document.getElementById('breadcrumbs');
  if (breadcrumbs) {
    const catId = product.category_id || '';
    const catName = product.category_name || 'Категорія';

    breadcrumbs.innerHTML = `
      <a href="/index.html">Головна</a> 
      <span class="separator">/</span> 
      <a href="/category.html?categoryId=${catId}">${catName}</a>
      <span class="separator">/</span> 
      <span class="current">${product.name}</span>
    `;
  }

  // Опис
  if (product.description && product.description.trim() !== '') {
    descriptionElement.classList.add('product-description-text');
    descriptionElement.textContent = product.description;
    descriptionElement.setAttribute('data-clarity-unmask', 'true');
    descriptionSection.style.display = 'block';
  } else {
    descriptionSection.style.display = 'none';
  }

  // Зображення
  const productImg = document.getElementById('product-image');
  productImg.src = getOptimizedImg(product.image);;
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
  section.setAttribute('data-clarity-unmask', 'true');

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
      <td>${product.diameter || '-'} мм</td>
      <td>${product.weight || '-'} кг</td>
      <td class="price-cell ${isAvailable ? 'active' : ''}" data-type="retail">${product.price_retail} грн / ${product.unit}</td>
      <td class="price-cell" data-type="company">${product.price_company} грн / ${product.unit}</td>
      <!--<td class="price-cell" data-type="wholesale">${product.price_wholesale} грн</td> -->
      <td class="wholesale-info">
    <span class="price-val">${product.price_wholesale} грн / ${product.unit}</span>
    <span class="threshold-text">від ${product.wholesale_threshold} ${product.unit}</span>
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
      /*showToast(`${currentProduct.name} додано до кошика!`); */

      showToast(
        `${product.name} додано до кошика! <strong style="color: #FFD700; margin-left: 8px;">Перейти ➔</strong>`
      );
      console.log('Данные товара с сервера:', product);
      addToCart({
        productId: product.id,
        name: product.name,
        image: getOptimizedImg(product.image),
        manufacturer: product.manufacturer_name || '',
        diameter: product.diameter || '',
        weight: product.weight || '',
        selectedType,
        price,
        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        wholesale_threshold: product.wholesale_threshold,

        unit: product.unit || 'шт',

        has_dynamic_pricing: product.has_dynamic_pricing,
        markup_tier1: product.markup_tier1,
        markup_tier2: product.markup_tier2,
        markup_tier3: product.markup_tier3,
        cut_fee: product.cut_fee,
      });
      updateCartUI();
    });
  }
  tbody.appendChild(row);

  manufacturerContainer.appendChild(section);

  // --- НОВИЙ КОД: БЛОК ІНФОРМАЦІЇ ПРО ДОСТАВКУ ---
  const deliverySection = document.createElement('div');
  deliverySection.classList.add('product-delivery-info');
  deliverySection.setAttribute('data-clarity-unmask', 'true'); // Відкриваємо для Clarity

  deliverySection.innerHTML = `
    <div class="delivery-item">
      <span class="icon">🚚</span>
      <div class="text">
        <strong>Доставка:</strong> Нова Пошта, Делівері, Самовивіз у Харкові 
        <a href="/delivery.html" target="_blank">Детальніше ➔</a>
      </div>
    </div>
    <div class="delivery-item">
      <span class="icon">📦</span>
      <div class="text">
        <strong>Відправка:</strong> У день замовлення (при оформленні до 14:00, крім вихідних)
      </div>
    </div>
    <div class="delivery-item">
      <span class="icon">💳</span>
      <div class="text">
        <strong>Оплата:</strong> Оплата: Накладений платіж (при отриманні), Оплата на картку
      </div>
    </div>
    <div class="delivery-item">
      <span class="icon">🔄</span>
      <div class="text">
        <strong>Гарантія:</strong> Обмін та повернення товару протягом 14 днів
      </div>
    </div>
  `;

  manufacturerContainer.appendChild(deliverySection);
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

initProductPage();
updateCartUI();
