import { initProductCard } from './script.js';
import { updateCartUI } from './cart.js';

function initHomePage() {
  const specialContainer = document.getElementById('special-products-container');

  const products = window.INITIAL_SPECIAL_PRODUCTS;

  if (!specialContainer || !Array.isArray(products)) return;

  const cards = specialContainer.querySelectorAll('.product-card');

  cards.forEach((card, index) => {
    if (products[index]) {
      initProductCard(card, products[index]);
    }
  });
}

initHomePage();
updateCartUI();
