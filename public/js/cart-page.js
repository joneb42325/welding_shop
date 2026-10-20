import {
  getCart,
  getCartTotal,
  removeFromCart,
  changeQuantity,
  updateCartUI,
  clearCart,
  calculateDynamicPrice,
} from './cart.js';
import { loadCategories, getOptimizedImg } from './script.js';

refreshCart();

function renderCartPage() {
  const cartTableBody = document.querySelector('#cart-table tbody');
  const cartContainer = document.querySelector('.cart-section');

  if (!cartTableBody) return;

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
    <div class="empty-state-wrapper">
      <div class="empty-message">
        <h2>Ваш кошик порожній 📦</h2>
        <p>Схоже, ви ще нічого не додали. Завітайте до нашого каталогу!</p>
        <a href="/index.html" class="btn-back">Повернутися до покупок</a>
      </div>
    </div>
    `;
    cartContainer.style.background = 'none';
    cartContainer.style.border = 'none';
    cartContainer.style.boxShadow = 'none';
    return;
  }

  cartTableBody.innerHTML = '';

  cart.forEach((item, index) => {
    const row = document.createElement('tr');

    let price = parseFloat(item.price) || 0;
    let total = 0;
    let statusContent = '';
    let priceClass = '';

    // Отримуємо юніт з товару, якщо його немає (старі товари) — ставимо 'шт'
    const unit = item.unit || 'шт';

    if (item.has_dynamic_pricing) {
      const calc = calculateDynamicPrice(item, item.quantity);
      price = calc.pricePerKg;
      total = calc.totalPrice;

      // Визначаємо, чи досягнуто поріг опту
      const threshold = parseInt(item.wholesale_threshold) || 999999;
      const isWholesale = item.quantity >= threshold;

      let typeLabel = isWholesale ? 'ОПТ' : formatType(item.selectedType);

      if (isWholesale) {
        priceClass = 'opt-price';
        // Якщо опт досягнуто, виводимо ОПТ і порізку
        statusContent = `<strong class="opt-badge">ОПТ</strong> <span style="font-size: 0.9em; opacity: 0.8;">/ Порізка +${calc.cutFee} грн</span>`;
      } else {
        // Якщо опт НЕ досягнуто, виводимо ЧП, порізку, і на новому рядку підказку
        statusContent = `${typeLabel} <span style="font-size: 0.9em; opacity: 0.8;">/ Порізка +${calc.cutFee} грн</span>`;
        if (threshold < 999999) {
          statusContent += `<br><span class="opt-hint">Опт від ${threshold} ${unit}</span>`;
        }
      }
    } else {

      total = price * item.quantity;

      const threshold = parseInt(item.wholesale_threshold) || 999999;
      const isWholesale = item.quantity >= threshold;

      if (isWholesale) {
        statusContent = `<strong class="opt-badge">ОПТ</strong>`;
        priceClass = 'opt-price';
      } else {
        statusContent = formatType(item.selectedType);
        if (threshold < 999999) {
          statusContent += `<br><span class="opt-hint">Опт від ${threshold} ${unit}</span>`;
        }
      }
    }

    row.innerHTML = `
      <td class="cart-product-cell">
        <a href="product.html?productId=${item.productId}" class="cart-product-link">
            <img src="${getOptimizedImg(item.image)}" alt="${item.name}">
            <div class="cart-product-info">
            <span>${item.name}</span>
              <!-- Новий блок ціни спеціально для мобілки -->
              <span class="mobile-unit-price ${priceClass}">${price.toFixed(2)} грн / ${unit}</span>
            </div>
        </a>
      </td>
      <td class="${priceClass}">${price.toFixed(2)} грн / ${unit}</td>
      <td>
        <div class="quantity-controls">
          <button class="qty-btn minus">-</button>
          <input type="number" class="qty-input" value="${item.quantity}" min="1" step="1">
          <button class="qty-btn plus">+</button>
        </div>
       </td>
      <td><strong>${total.toFixed(2)} грн</strong></td>
      <td>${statusContent}</td>
      <td>
        <button class="delete-btn">❌</button>
      </td>
    `;

    const qtyInput = row.querySelector('.qty-input');
    const minusBtn = row.querySelector('.qty-btn.minus');
    const plusBtn = row.querySelector('.qty-btn.plus');
    const deleteBtn = row.querySelector('.delete-btn');

    qtyInput.addEventListener('change', () => {
      let newQty = parseInt(qtyInput.value);
      if (isNaN(newQty) || newQty < 1) newQty = 1;

      // Виправлено помилку віднімання
      const diff = newQty - item.quantity;
      changeQuantity(index, diff);
      refreshCart();
    });

    qtyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') qtyInput.blur();
    });

    minusBtn.addEventListener('click', () => {
      changeQuantity(index, -1);
      refreshCart();
    });

    plusBtn.addEventListener('click', () => {
      changeQuantity(index, 1);
      refreshCart();
    });

    deleteBtn.addEventListener('click', () => {
      if (confirm('Видалити товар?')) {
        removeFromCart(index);
        refreshCart();
      }
    });

    cartTableBody.appendChild(row);
  });

  document.getElementById('cart-page-total').textContent = getCartTotal();
}

function formatType(type) {
  switch (type) {
    case 'retail':
      return 'ЧП';
    case 'company':
      return 'ФОП';
    case 'wholesale':
      return 'Опт';
    default:
      return type || 'ЧП';
  }
}

function refreshCart() {
  renderCartPage();
  updateCartUI();
}

const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.querySelector('.close-modal');
const orderButton = document.querySelector('.order-button');
const checkoutForm = document.getElementById('checkout-form');
const modalTotalPrice = document.getElementById('modal-total-price');

if (orderButton) {
  orderButton.addEventListener('click', () => {
    const cart = getCart();
    if (cart.length === 0) {
      alert('Ваша корзина порожня!');
      return;
    }
    modalTotalPrice.textContent = getCartTotal();
    checkoutModal.classList.remove('hidden');
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    checkoutModal.classList.add('hidden');
  });
}

window.addEventListener('click', (e) => {
  if (e.target === checkoutModal) {
    checkoutModal.classList.add('hidden');
  }
});

const clearBtn = document.getElementById('clear-cart-btn');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm('Ви впевнені, що хочете видалити всі товари з кошика?')) {
      clearCart();
      refreshCart();
    }
  });
}

if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(checkoutForm);
    const customerData = Object.fromEntries(formData.entries());

    const cartItems = getCart();
    const totalSum = getCartTotal();

    const orderPayload = {
      customer: customerData,
      items: cartItems,
      totalPrice: totalSum,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', {
            send_to: 'AW-18487453527/lSUhCIqu-4wdENfOwO9E',
            value: parseFloat(totalSum) || 1.0,
            currency: 'UAH',
            transaction_id: '',
          });
        }
        alert("Дякуємо! Ваше замовлення успішно прийнято. Ми зв'яжемося з вами найближчим часом.");
        clearCart();
        refreshCart();
        checkoutModal.classList.add('hidden');
        checkoutForm.reset();
      } else {
        const errorData = await res.json();
        alert('Помилка при оформленні: ' + (errorData.error || 'Спробуйте пізніше'));
      }
    } catch (err) {
      console.error('Order error:', err);
      alert("Помилка з'єднання з сервером. Перевірте інтернет та спробуйте ще раз.");
    }
  });
}

loadCategories();
