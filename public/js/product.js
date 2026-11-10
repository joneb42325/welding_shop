import { addToCart, updateCartUI, showToast } from './cart.js';
import { isFavorite, toggleFavorite } from './favorites.js';
import { getOptimizedImg, initProductCard } from './script.js';
import { calculateDynamicPrice } from './pricing.js';

function initRelatedProductsUI() {
  const container = document.getElementById('related-products-grid');
  const relatedData = window.INITIAL_RELATED_PRODUCTS;

  if (!container || !Array.isArray(relatedData) || relatedData.length === 0) return;

  // Находим все отрендеренные SSR-карточки в слайдере похожих товаров
  const cards = container.querySelectorAll('.product-card');

  relatedData.forEach((product, index) => {
    if (cards[index]) {
      // Навешиваем ваши готовые обработчики кошелька и избранного
      initProductCard(cards[index], product);
    }
  });
}

// Запускаем при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  initRelatedProductsUI();
});

const params = new URLSearchParams(window.location.search);
const productId =
  params.get('productId') || window.location.pathname.match(/^\/product\/(?:.*-)?(\d+)\/?$/)?.[1];

const manufacturerContainer = document.getElementById('manufacturer-tables');
let currentProduct = null;

async function initProductPage() {
  if (!manufacturerContainer) return;

  try {
    if (window.INITIAL_PRODUCT_DATA) {
      currentProduct = window.INITIAL_PRODUCT_DATA;
    } else {
      if (!productId) return;
      const productRes = await fetch(`/api/products/${productId}`);
      if (!productRes.ok) throw new Error('Товар не знайдено');
      currentProduct = await productRes.json();
    }

    renderTable(currentProduct);
    setupFavoriteButton(currentProduct.id);
    initSliderControls();
  } catch (err) {
    console.error('Помилка завантаження сторінки:', err);
  }
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
  const row = manufacturerContainer?.querySelector('tbody tr');
  if (!product || !row || !pricesSection) return;

  pricesSection.classList.remove('is-empty');
  manufacturerContainer.style.display = '';

  const isAvailable = Number(product.stock) > 0;
  const isWholesaleOnly = Boolean(product.is_wholesale);
  const minWholesaleQty = parseInt(product.wholesale_threshold, 10) || 50;
  const initialQty = isWholesaleOnly ? minWholesaleQty : 1;
  const qtyInput = row.querySelector('.qty-input');
  const totalValEl = row.querySelector('.total-val');
  const unit = product.unit || 'шт';

  if (!qtyInput) return;

  let selectedType = isWholesaleOnly ? 'wholesale' : 'retail';
  const priceCells = row.querySelectorAll('.price-cell');

  priceCells.forEach((cell) => {
    cell.classList.toggle('active', cell.dataset.type === selectedType && isAvailable);
    if (isWholesaleOnly && cell.dataset.type !== 'wholesale') {
      cell.style.pointerEvents = 'none';
      cell.style.opacity = '0.5';
    }
  });

  const getBasePrice = () =>
    parseFloat(product[`price_${selectedType}`] ?? product.price_retail) || 0;

  const calculateTotal = (qty) => {
    const basePrice = getBasePrice();
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
      return calculateDynamicPrice(tempItem, qty).totalPrice;
    }
    return basePrice * qty;
  };

  const updateTotalSum = () => {
    const qty = parseInt(qtyInput.value, 10) || initialQty;
    const finalTotal = calculateTotal(qty);
    if (totalValEl) totalValEl.textContent = Number(finalTotal).toFixed(0);

    const hintEl = row.querySelector('.dynamic-pricing-hint');
    if (!hintEl) return;
    if (!product.has_dynamic_pricing) {
      hintEl.textContent = '';
      return;
    }

    const threshold = minWholesaleQty;
    const cutFee = product.cut_fee !== undefined ? parseFloat(product.cut_fee) || 0 : 40;
    let discountPercent = 0;

    if (qty >= 10 && qty < threshold)
      discountPercent = Math.round((parseFloat(product.markup_tier3) || 0.3) * 100);
    else if (qty >= 5 && qty < 10)
      discountPercent = Math.round((parseFloat(product.markup_tier2) || 0.15) * 100);

    if (qty >= threshold) {
      hintEl.textContent = '✓ Застосовано оптову ціну';
      hintEl.style.color = '#4ade80';
    } else {
      let text = '';
      if (discountPercent > 0) {
        text = `(знижка -${discountPercent}%`;
        if (cutFee > 0) text += `, вкл. порізку ${cutFee} грн`;
        text += ')';
      } else if (cutFee > 0) text = `(вкл. порізку ${cutFee} грн)`;
      hintEl.textContent = text;
      hintEl.style.color = discountPercent > 0 ? '#4ade80' : '#94a3b8';
    }
  };

  const checkWholesaleThreshold = () => {
    if (isWholesaleOnly) return;
    const qty = parseInt(qtyInput.value, 10) || 1;
    if (qty >= minWholesaleQty && selectedType !== 'wholesale') {
      selectedType = 'wholesale';
      priceCells.forEach((cell) =>
        cell.classList.toggle('active', cell.dataset.type === 'wholesale')
      );
      showToast(`Застосовано оптову ціну (від ${minWholesaleQty} ${unit})! ✨`);
    } else if (qty < minWholesaleQty && selectedType === 'wholesale') {
      selectedType = 'retail';
      priceCells.forEach((cell) => cell.classList.toggle('active', cell.dataset.type === 'retail'));
    }
  };

  priceCells.forEach((cell) => {
    cell.addEventListener('click', () => {
      if (isWholesaleOnly || !isAvailable) return;
      selectedType = cell.dataset.type;
      priceCells.forEach((item) => item.classList.toggle('active', item === cell));
      if (selectedType === 'wholesale') {
        const qty = parseInt(qtyInput.value, 10) || 1;
        if (qty < minWholesaleQty) {
          qtyInput.value = minWholesaleQty;
          showToast(`Встановлено оптову кількість: ${minWholesaleQty} ${unit}`);
        }
      }
      updateTotalSum();
    });
  });

  row.querySelector('.minus')?.addEventListener('click', () => {
    const qty = parseInt(qtyInput.value, 10) || initialQty;
    const minAllowed = isWholesaleOnly ? minWholesaleQty : 1;
    if (qty > minAllowed) {
      qtyInput.value = qty - 1;
      checkWholesaleThreshold();
      updateTotalSum();
    }
  });

  row.querySelector('.plus')?.addEventListener('click', () => {
    const qty = parseInt(qtyInput.value, 10) || initialQty;
    if (qty < 999) {
      qtyInput.value = qty + 1;
      checkWholesaleThreshold();
      updateTotalSum();
    }
  });

  qtyInput.addEventListener('input', () => {
    const qty = parseInt(qtyInput.value, 10);
    if (!Number.isNaN(qty) && qty >= 1 && qty <= 999) {
      checkWholesaleThreshold();
      updateTotalSum();
    }
  });

  qtyInput.addEventListener('blur', () => {
    const minAllowed = isWholesaleOnly ? minWholesaleQty : 1;
    let qty = parseInt(qtyInput.value, 10);
    if (Number.isNaN(qty) || qty < minAllowed) qty = minAllowed;
    qty = Math.min(qty, 999);
    qtyInput.value = qty;
    checkWholesaleThreshold();
    updateTotalSum();
  });

  row.querySelector('.add-to-cart')?.addEventListener('click', () => {
    if (!isAvailable) return;
    const quantity = parseInt(qtyInput.value, 10) || initialQty;
    const price = getBasePrice();
    showToast(
      `${product.name} (${quantity} ${unit}) додано до кошика!  <strong class="toast-action-link">Перейти ➔</strong>`
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
      price_company: product.price_company,
      price_wholesale: product.price_wholesale,
      wholesale_threshold: product.wholesale_threshold,
      unit,
      has_dynamic_pricing: product.has_dynamic_pricing,
      is_wholesale: product.is_wholesale,
      markup_tier1: product.markup_tier1,
      markup_tier2: product.markup_tier2,
      markup_tier3: product.markup_tier3,
      cut_fee: product.cut_fee,
      quantity,
    });
    updateCartUI();
  });

  row.querySelector('.quick-order-btn')?.addEventListener('click', () => {
    if (!isAvailable) return;
    const quantity = parseInt(qtyInput.value, 10) || initialQty;
    openQuickOrderModal(product, calculateTotal(quantity), quantity, selectedType);
  });

  if (isAvailable) updateTotalSum();
}

function openQuickOrderModal(product, totalPrice, quantity = 1, selectedType = 'retail') {
  const existingModal = document.getElementById('quick-order-modal');
  if (existingModal) existingModal.remove();

  const formattedTotal = typeof totalPrice === 'number' ? totalPrice.toFixed(0) : totalPrice;
  let cutFeeText = '';

  if (product.has_dynamic_pricing) {
    const basePrice = parseFloat(product[`price_${selectedType}`] || product.price_retail);
    const calc = calculateDynamicPrice({ ...product, price: basePrice, selectedType }, quantity);
    if (calc.cutFee > 0)
      cutFeeText = `<span style="font-size: 12px; opacity: 0.85; display: block; margin-top: 2px;">(включно з порізкою ${calc.cutFee} грн)</span>`;
  }

  const modalHTML = `
    <div id="quick-order-modal" class="quick-modal-overlay">
      <div class="quick-modal-box">
        <button class="quick-modal-close">&times;</button>
        <h3>Купити в 1 клік</h3>
        <p>Заповніть форму, і менеджер зателефонує вам для уточнення деталей (обробка замовлень: щодня з 10:00 до 17:00)</p>
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

    const unitPrice = parseFloat(product[`price_${selectedType}`] || product.price_retail);

    try {
      const res = await fetch('/api/quick-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          price: unitPrice,
          quantity,
          name,
          phone,
        }),
      });
      if (res.ok) {
        showToast('Дякуємо! Менеджер зателефонує вам найближчим часом.');
        closeModal();
      } else {
        throw new Error();
      }
    } catch (err) {
      showToast('Помилка при оформленні. Спробуйте ще раз.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Підтвердити замовлення';
    }
  });
}

// Управління слайдером схожих товарів (EJS рендерить, JS тільки крутить стрілки)
function initSliderControls() {
  const relatedContainer = document.getElementById('related-products-grid');
  const prevBtn = document.getElementById('related-prev');
  const nextBtn = document.getElementById('related-next');

  if (relatedContainer && prevBtn && nextBtn) {
    prevBtn.onclick = () => relatedContainer.scrollBy({ left: -250, behavior: 'smooth' });
    nextBtn.onclick = () => relatedContainer.scrollBy({ left: 250, behavior: 'smooth' });
  }
}

const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('full-image');

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'product-image' && modal && modalImg) {
    modal.style.display = 'flex';
    modalImg.src = getOptimizedImg(currentProduct.image, 1200);
  }
});

if (modal) {
  modal.addEventListener('click', () => (modal.style.display = 'none'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.style.display = 'none';
  });
}

initProductPage();
