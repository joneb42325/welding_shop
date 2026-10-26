import { addToCart, updateCartUI, showToast, calculateDynamicPrice } from './cart.js';
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
    const productRes = await fetch(`/product/${productId}`);
    if (!productRes.ok) throw new Error('Товар не знайдено');

    currentProduct = await productRes.json();

    renderProductInfo(currentProduct);
    renderTable(currentProduct);
  } catch (err) {
    console.error('Помилка завантаження сторінки:', err);
    renderEmptyState();
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

    const oldStatus = nameEl.parentNode.querySelector('.stock-status');
    if (oldStatus) oldStatus.remove();

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

  if (product.description && product.description.trim() !== '') {
    descriptionElement.classList.add('product-description-text');
    descriptionElement.textContent = product.description;
    descriptionElement.setAttribute('data-clarity-unmask', 'true');
    descriptionSection.style.display = 'block';
  } else {
    descriptionSection.style.display = 'none';
  }

  const productImg = document.getElementById('product-image');
  if (productImg) {
    productImg.src = getOptimizedImg(product.image);
    productImg.alt = `Фото товару: ${displayName}`;
  }

  setupFavoriteButton(product.id);
}

function setupFavoriteButton(id) {
  const productInfo = document.querySelector('.product-info');
  if (!productInfo) return;

  const oldFavBtn = productInfo.querySelector('.fav-btn');
  if (oldFavBtn) oldFavBtn.remove();

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
          <th>Кількість</th>
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
      <td class="price-cell ${isAvailable ? 'active' : ''}" data-type="retail">
        ${product.price_retail} грн / ${product.unit || 'шт'}
      </td>
      <td class="price-cell" data-type="company">
        ${product.price_company || product.price_retail} грн / ${product.unit || 'шт'}
      </td>
      <td class="price-cell" data-type="wholesale">
        <div class="wholesale-info" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span class="price-val">${product.price_wholesale} грн / ${product.unit || 'шт'}</span>
          <span class="threshold-text">від ${product.wholesale_threshold || 50} ${product.unit || 'шт'}</span>
        </div>
      </td>
      <td>
        <div class="quantity-controls">
          <button class="qty-btn minus" ${!isAvailable ? 'disabled' : ''}>-</button>
          <input type="number" class="qty-input" value="1" min="1" ${!isAvailable ? 'disabled' : ''}>
          <button class="qty-btn plus" ${!isAvailable ? 'disabled' : ''}>+</button>
        </div>
        ${
          isAvailable
            ? `<span class="row-total-price" style="font-size: 13px; font-weight: bold; color: #FFD700; margin-top: 8px; display: block; text-align: center;">
                  Разом: <span class="total-val">0</span> грн
                </span>`
            : ''
        }
      </td>
      <td>
        <div class="action-controls">
          <div class="action-buttons">
            <button class="add-to-cart" ${!isAvailable ? 'disabled' : ''}>
              ${isAvailable ? 'В кошик' : 'Немає'}
            </button>
            ${isAvailable ? '<button class="quick-order-btn">Швидке замовлення</button>' : ''}
          </div>
        </div>
      </td>
    `;

  if (isAvailable) {
    const qtyInput = row.querySelector('.qty-input');
    const totalValEl = row.querySelector('.total-val');

    // Функція розрахунку повної вартості
    const calculateTotal = (qty) => {
      const basePrice = parseFloat(product[`price_${selectedType}`] || product.price_retail);
      if (product.has_dynamic_pricing) {
        const tempItem = {
          selectedType,
          price: basePrice,
          price_retail: product.price_retail,
          price_wholesale: product.price_wholesale,
          wholesale_threshold: product.wholesale_threshold,
          markup_tier1: product.markup_tier1,
          markup_tier2: product.markup_tier2,
          markup_tier3: product.markup_tier3,
          cut_fee: product.cut_fee,
        };
        const calc = calculateDynamicPrice(tempItem, qty);
        return calc.totalPrice;
      } else {
        return basePrice * qty;
      }
    };

    // Оновлення підсумкової суми в таблиці
    const updateTotalSum = () => {
      const qty = parseInt(qtyInput.value) || 1;
      const finalTotal = calculateTotal(qty);
      if (totalValEl) {
        totalValEl.textContent = finalTotal.toFixed(0);
      }
    };

    updateTotalSum();

    const checkWholesaleThreshold = () => {
      const qty = parseInt(qtyInput.value) || 1;
      const threshold = product.wholesale_threshold || 50;

      // Если ввели больше или равно порогу, но опт еще не выбран — переключаем на опт
      if (qty >= threshold && selectedType !== 'wholesale') {
        selectedType = 'wholesale';
        row.querySelectorAll('.price-cell').forEach((c) => c.classList.remove('active'));
        const wholesaleCell = row.querySelector('.price-cell[data-type="wholesale"]');
        if (wholesaleCell) wholesaleCell.classList.add('active');
        showToast(`Застосовано оптову ціну (від ${threshold} ${product.unit || 'шт'})! ✨`);
      }
      // Если снизили количество ниже порога, а стоял опт — возвращаем на розницу
      else if (qty < threshold && selectedType === 'wholesale') {
        selectedType = 'retail';
        row.querySelectorAll('.price-cell').forEach((c) => c.classList.remove('active'));
        const retailCell = row.querySelector('.price-cell[data-type="retail"]');
        if (retailCell) retailCell.classList.add('active');
      }
    };

    row.querySelectorAll('.price-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        selectedType = cell.dataset.type;
        row.querySelectorAll('.price-cell').forEach((c) => c.classList.remove('active'));
        cell.classList.add('active');

        if (selectedType === 'wholesale') {
          const minWholesale = product.wholesale_threshold || 50;
          if (qtyInput && parseInt(qtyInput.value) < minWholesale) {
            qtyInput.value = minWholesale;
            showToast(`Встановлено оптову кількість: ${minWholesale} ${product.unit || 'шт'}`);
          }
        }
        updateTotalSum();
      });
    });

    row.querySelector('.minus').addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) {
        qtyInput.value = val - 1;
        checkWholesaleThreshold();
        updateTotalSum();
      }
    });

    row.querySelector('.plus').addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
      checkWholesaleThreshold();
      updateTotalSum();
    });

    qtyInput.addEventListener('input', () => {
      if (parseInt(qtyInput.value) < 1 || !qtyInput.value) {
        qtyInput.value = 1;
      }
      checkWholesaleThreshold();
      updateTotalSum();
    });

    row.querySelector('.add-to-cart').addEventListener('click', () => {
      const price = product[`price_${selectedType}`] || product.price_retail;
      const selectedQuantity = parseInt(qtyInput.value) || 1;

      showToast(
        `${product.name} (${selectedQuantity} ${product.unit || 'шт'}) додано до кошика! <strong style="color: #FFD700; margin-left: 8px;">Перейти ➔</strong>`
      );

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
        quantity: selectedQuantity,
      });
      updateCartUI();
    });

    const quickBtn = row.querySelector('.quick-order-btn');
    if (quickBtn) {
      quickBtn.addEventListener('click', () => {
        const selectedQuantity = parseInt(qtyInput.value) || 1;
        const calculatedTotal = calculateTotal(selectedQuantity);
        openQuickOrderModal(product, calculatedTotal, selectedQuantity, selectedType);
      });
    }
  }

  tbody.appendChild(row);
  manufacturerContainer.appendChild(section);

  const deliverySection = document.createElement('div');
  deliverySection.classList.add('product-delivery-info');
  deliverySection.setAttribute('data-clarity-unmask', 'true');

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
        <strong>Оплата:</strong> Накладений платіж (при отриманні), Оплата на картку / IBAN
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
  if (!pricesSection) return;

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

function openQuickOrderModal(product, totalPrice, quantity = 1, selectedType = 'retail') {
  const existingModal = document.getElementById('quick-order-modal');
  if (existingModal) existingModal.remove();

  const formattedTotal = typeof totalPrice === 'number' ? totalPrice.toFixed(0) : totalPrice;

  let cutFeeText = '';
  if (product.has_dynamic_pricing) {
    const basePrice = parseFloat(product[`price_${selectedType}`] || product.price_retail);
    const tempItem = {
      selectedType,
      price: basePrice,
      price_retail: product.price_retail,
      price_wholesale: product.price_wholesale,
      wholesale_threshold: product.wholesale_threshold,
      markup_tier1: product.markup_tier1,
      markup_tier2: product.markup_tier2,
      markup_tier3: product.markup_tier3,
      cut_fee: product.cut_fee,
    };
    const calc = calculateDynamicPrice(tempItem, quantity);
    if (calc.cutFee > 0) {
      cutFeeText = `<span style="font-size: 12px; opacity: 0.85; display: block; margin-top: 2px;">(включно з порізкою ${calc.cutFee} грн)</span>`;
    }
  }

  const modalHTML = `
    <div id="quick-order-modal" class="quick-modal-overlay">
      <div class="quick-modal-box">
        <button class="quick-modal-close">&times;</button>
        <h3>Купити в 1 клік</h3>
        <p>Заповніть форму, і ми зв'яжемося з вами для уточнення деталей доставки.</p>

        <div class="quick-order-summary">
          <span class="label">Ваше замовлення:</span>
          <span class="product-title">${product.name} (${quantity} ${product.unit || 'шт'})</span>
          <span class="product-price">${formattedTotal} грн ${cutFeeText}</span>
        </div>
        
        <form id="quick-order-form">
          <div class="quick-form-group">
            <input type="text" id="quick-name" placeholder="Ім'я (необов'язково)">
          </div>
          <div class="quick-form-group">
            <input type="tel" id="quick-phone" placeholder="Номер телефону *" required autofocus>
          </div>
          <button type="submit" class="quick-submit-btn">Підтвердити замовлення</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('quick-order-modal');
  const closeBtn = modal.querySelector('.quick-modal-close');

  const closeModal = () => {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 250);
  };

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('quick-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('quick-phone').value;
    const name = document.getElementById('quick-name').value;

    const submitBtn = modal.querySelector('.quick-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Відправка...';

    // Получаем чистую цену за 1 шт/кг для отправки на сервер
    const unitPrice = parseFloat(product[`price_${selectedType}`] || product.price_retail);

    try {
      const res = await fetch('/api/quick-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          price: unitPrice, // ИСПРАВЛЕНО: передаем цену за 1 шт, а не итоговую сумму
          quantity: quantity,
          name: name,
          phone: phone,
        }),
      });

      if (res.ok) {
        showToast('Дякуємо! Менеджер зателефонує вам найближчим часом.');
        closeModal();
      } else {
        showToast('Помилка при оформленні. Спробуйте ще раз.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Підтвердити замовлення';
      }
    } catch (err) {
      console.error(err);
      showToast("Помилка з'єднання з сервером.");
      submitBtn.disabled = false;
      submitBtn.textContent = 'Підтвердити замовлення';
    }
  });
}

initProductPage();
updateCartUI();
