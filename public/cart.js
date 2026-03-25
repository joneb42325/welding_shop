const CART_KEY = "cart";

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item) {
  const cart = getCart();

  const existing = cart.find(
    (i) =>
      i.productId === item.productId &&
      i.diameter === item.diameter &&
      i.weight === item.weight &&
      i.manufacturer === item.manufacturer &&
      i.selectedType === item.selectedType &&
      i.price === item.price,
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  saveCart(cart);
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

export function changeQuantity(index, delta) {
  const cart = getCart();
  cart[index].quantity += delta;

  if (cart[index].quantity < 1) {
    if (confirm("Видалити товар з кошика?")) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = 1;
    }
  }

  saveCart(cart);
}

export function updateCartUI() {
  const count = getCartCount();
  const total = getCartTotal();

  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");

  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = total;
}
