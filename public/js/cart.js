const CART_KEY = 'cart';

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function calculateDynamicPrice(item, quantity) {
  const qty = parseFloat(quantity) || 1;
  let base = parseFloat(item.price_retail) || parseFloat(item.price) || 0;

  const cutFee = item.cut_fee !== undefined ? parseFloat(item.cut_fee) : 40;
  const t1 = item.markup_tier1 !== undefined ? parseFloat(item.markup_tier1) : 0.75;
  const t2 = item.markup_tier2 !== undefined ? parseFloat(item.markup_tier2) : 0.5;
  const t3 = item.markup_tier3 !== undefined ? parseFloat(item.markup_tier3) : 0.25;

  const threshold = parseInt(item.wholesale_threshold) || 50;
  let markup = 0;

  if (qty >= 1 && qty < 5) {
    markup = t1;
  } else if (qty >= 5 && qty < 10) {
    markup = t2;
  } else if (qty >= 10 && qty < 50) {
    markup = t3;
  } else if (qty >= 50 && qty < threshold) {
    markup = 0.0;
  } else if (qty >= threshold) {
    markup = 0.0;
    const wholesale = parseFloat(item.price_wholesale);
    if (wholesale > 0) {
      base = wholesale;
    }
  }

  // ПРИБРАНО Math.round, щоб не губилися копійки
  const pricePerKg = Number((base * (1 + markup)).toFixed(2));
  const totalPrice = Math.round(qty * pricePerKg + cutFee);

  return { pricePerKg, totalPrice, cutFee, markupPercent: markup * 100 };
}

export function getCartTotal() {
  const cart = getCart();
  const sum = cart.reduce((acc, item) => {
    if (item.has_dynamic_pricing) {
      const calc = calculateDynamicPrice(item, item.quantity);
      return acc + calc.totalPrice;
    }
    return acc + (parseFloat(item.price) || 0) * item.quantity;
  }, 0);

  // Повертаємо загальну суму з копійками
  return Number(sum.toFixed(2));
}

export function updateItemPrice(item) {
  if (item.has_dynamic_pricing) {
    const calc = calculateDynamicPrice(item, item.quantity);
    return calc.pricePerKg;
  }

  const retail = parseFloat(item.price_retail) || parseFloat(item.price) || 0;
  const wholesale = parseFloat(item.price_wholesale) || retail;
  const threshold = parseInt(item.wholesale_threshold) || 999999;

  if (item.quantity >= threshold) {
    return wholesale;
  }
  return retail;
}

export function addToCart(item) {
  const cart = getCart();

  const existingIndex = cart.findIndex(
    (i) =>
      i.productId === item.productId &&
      i.diameter === item.diameter &&
      i.weight === item.weight &&
      i.manufacturer === item.manufacturer &&
      i.selectedType === item.selectedType
  );

  if (existingIndex !== -1) {
    changeQuantity(existingIndex, 1);
  } else {
    const newItem = {
      ...item,
      quantity: item.quantity || 1,
    };
    newItem.price = updateItemPrice(newItem);

    cart.push(newItem);
    saveCart(cart);
  }
}

export function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

export function getCartCount() {
  const cart = getCart();
  return cart.length;
 /* return cart.reduce((count, item) => count + item.quantity, 0); */
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function changeQuantity(index, delta) {
  const cart = getCart();
  const item = cart[index];

  if (!item) return;

  item.quantity += delta;

  if (item.quantity < 1) {
    if (confirm('Видалити товар з кошика?')) {
      cart.splice(index, 1);
      saveCart(cart);
      return;
    } else {
      cart[index].quantity = 1;
    }
  }

  item.price = updateItemPrice(item);

  saveCart(cart);
}

export function updateCartUI() {
  const count = getCartCount();
  const total = getCartTotal();

  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');

  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? 'block' : 'none';
  });

  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = total;
}

export function showToast(message, type = 'success') {
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
