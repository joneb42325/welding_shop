import {
  getCart,
  getCartTotal,
  removeFromCart,
  changeQuantity,
  updateCartUI,
} from "./cart.js";

refreshCart();

function renderCartPage() {
  const cartTableBody = document.querySelector("#cart-table tbody");
  const cartContainer = document.querySelector(".cart-section");
  const sidebar = document.querySelector(".sidebar");
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
  cartTableBody.innerHTML = "";

  cart.forEach((item, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.manufacturer}</td>
      <td>${item.diameter}</td>
      <td>${item.weight} кг</td>
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
    const minusBtn = row.querySelector(".qty-btn.minus");
    const plusBtn = row.querySelector(".qty-btn.plus");
    const deleteBtn = row.querySelector(".delete-btn");

    minusBtn.addEventListener("click", () => {
      changeQuantity(index, -1);
      refreshCart();
    });

    plusBtn.addEventListener("click", () => {
      changeQuantity(index, 1);
      refreshCart();
    });

    deleteBtn.addEventListener("click", () => {
      if (confirm("Видалити товар?")) {
        removeFromCart(index);
        refreshCart();
      }
    });
    cartTableBody.appendChild(row);
  });
  document.getElementById("cart-page-total").textContent = getCartTotal();
}

function formatType(type) {
  switch (type) {
    case "retail":
      return "ЧП";
    case "company":
      return "ТОВ";
    case "wholesale":
      return "Опт";
    default:
      return type;
  }
}

function refreshCart() {
  renderCartPage();
  updateCartUI();
}
