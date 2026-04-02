import {
  getCart,
  getCartTotal,
  removeFromCart,
  changeQuantity,
  updateCartUI,
  clearCart,
} from './cart.js';

refreshCart();

function renderCartPage() {
  const cartTableBody = document.querySelector('#cart-table tbody');
  const cartContainer = document.querySelector('.cart-section');
  const sidebar = document.querySelector('.sidebar');
  if (!cartTableBody) return;

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart-message">
        <h2>Ваша корзина порожня 📦</h2>
        <p>Схоже, ви ще нічого не додали. Завітайте до нашого каталогу!</p>
        <a href="index.html" class="btn-back">Повернутися до покупок</a>
      </div>
    `;
    return;
  }
  cartTableBody.innerHTML = '';

  cart.forEach((item, index) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.manufacturer}</td>
      <td>${item.diameter}</td>
      <td>${item.weight}</td>
      <td>${item.price}</td>
      <td>
      <div class="quantity-controls">
        <button class="qty-btn minus">-</button>
        <span class="qty-value">${item.quantity} </span>
        <button class="qty-btn plus">+</button>
        </div>
       </td>
      <td>${item.price * item.quantity}</td>
      <td>${formatType(item.selectedType)}</td>
      <td>
        <button class="delete-btn">❌</button>
      </td>
    `;
    const minusBtn = row.querySelector('.qty-btn.minus');
    const plusBtn = row.querySelector('.qty-btn.plus');
    const deleteBtn = row.querySelector('.delete-btn');

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
      return 'ТОВ';
    case 'wholesale':
      return 'Опт';
    default:
      return type;
  }
}

function refreshCart() {
  renderCartPage();
  updateCartUI();
}

// --- Логіка оформлення замовлення ---

const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.querySelector('.close-modal');
const orderButton = document.querySelector('.order-button'); // Ваша кнопка "Підтвердити замовлення"
const checkoutForm = document.getElementById('checkout-form');
const modalTotalPrice = document.getElementById('modal-total-price');

// Відкрити модалку
orderButton.addEventListener('click', () => {
  const cart = getCart();
  if (cart.length === 0) {
    alert('Ваша корзина порожня!');
    return;
  }
  modalTotalPrice.textContent = getCartTotal();
  checkoutModal.classList.remove('hidden');
});

// Закрити модалку
closeModalBtn.addEventListener('click', () => {
  checkoutModal.classList.add('hidden');
});

// Закрити при кліку поза вікном
window.addEventListener('click', (e) => {
  if (e.target === checkoutModal) {
    checkoutModal.classList.add('hidden');
  }
});

// Відправка форми
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Збираємо дані клієнта
  const formData = new FormData(checkoutForm);
  const customerData = Object.fromEntries(formData.entries());

  const cartItems = getCart();

  const orderPayload = {
    customer: customerData,
    items: cartItems,
    totalPrice: getCartTotal(),
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
