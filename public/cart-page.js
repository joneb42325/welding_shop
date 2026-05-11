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

  if (!cartTableBody) return;

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
    <div class="empty-state-wrapper">
      <div class="empty-message">
        <h2>Ваш кошик порожній 📦</h2>
        <p>Схоже, ви ще нічого не додали. Завітайте до нашого каталогу!</p>
        <a href="index.html" class="btn-back">Повернутися до покупок</a>
      </div>
      </div>
    `;
    cartContainer.style.background = 'none';
    cartContainer.style.border = 'none';
    cartContainer.style.boxShadow = 'none';
    return;
  }
  const clearBtn = document.getElementById('clear-cart-btn');

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Ви впевнені, що хочете видалити всі товари з кошика?')) {
        clearCart();
        refreshCart();
      }
    });
  }
  cartTableBody.innerHTML = '';

  cart.forEach((item, index) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
        <a href="product.html?productId=${item.productId}">
            ${item.name}
        </a>
      </td>
      <td>${item.manufacturer}</td>
      <td>${item.diameter}</td>
      <td>${item.weight}</td>
      <td>${item.price}</td>
      <td>
      <div class="quantity-controls">
        <button class="qty-btn minus">-</button>
        <input type="number" class="qty-input" value="${item.quantity}" min="1" step="1">
        <button class="qty-btn plus">+</button>
        </div>
       </td>
      <td>${item.price * item.quantity}</td>
      <td>${formatType(item.selectedType)}</td>
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

      if (isNaN(newQty) || newQty < 1) {
        newQty = 1;
      }
      const diff = newQty - item.quantity;

      changeQuantity(index, diff);
      refreshCart();
    });

    qtyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        qtyInput.blur(); // Прибираємо фокус, що викличе подію 'change'
      }
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
