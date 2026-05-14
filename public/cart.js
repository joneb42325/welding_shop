const CART_KEY = 'cart';

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
      quantity: 1,
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

export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function updateItemPrice(item) {
  const retail = parseFloat(item.price_retail) || parseFloat(item.price) || 0;
  const wholesale = parseFloat(item.price_wholesale) || retail;
  const threshold = parseInt(item.wholesale_threshold) || 999999;

  console.log('Поріг:', threshold, 'Роздріб:', retail, 'Опт:', wholesale);

  if (item.quantity >= threshold) {
    return wholesale;
  }
  return retail;
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
