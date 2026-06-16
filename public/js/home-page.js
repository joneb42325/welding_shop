import { createProductCard, loadCategories } from './script.js';
import { updateCartUI } from './cart.js';

async function loadSpecialProducts() {
  const specialContainer = document.getElementById('special-products-container');
  if (!specialContainer) return;

  try {
    const res = await fetch('/products/special');
    const products = await res.json();

    products.forEach((product) => {
      specialContainer.appendChild(createProductCard(product));
    });
  } catch (err) {
    console.error('Error loading products', err);
  }
}

loadSpecialProducts();
updateCartUI();
loadCategories();
