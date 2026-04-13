import { updateCartUI } from './cart.js';

export function createProductCard(product) {
  const isAvailable = product.total_stock > 0;

  const card = document.createElement('div');
  card.classList.add('product-card');

  card.innerHTML = `
    <img src="images/${product.image}" alt="${product.name}">
    
    <a href="product.html?productId=${product.id}">
      <h3>${product.name}</h3>
    </a>

    ${
      !isAvailable
        ? `<p class="out-of-stock">Немає в наявності</p>`
        : `<p><span class="available">В наявності</span></p>`
    }
  `;

  return card;
}

async function loadCategories() {
  const catalogList = document.getElementById('catalog-list');
  const catalogContainer = document.getElementById('catalog-container');

  if (!catalogList && !catalogContainer) return;

  try {
    const res = await fetch('/categories');
    const categories = await res.json();

    categories.forEach((category) => {
      if (catalogList) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="category.html?categoryId=${category.id}">
            ${category.name}
          </a>
        `;
        catalogList.appendChild(li);
      }

      if (catalogContainer) {
        const card = document.createElement('div');
        card.classList.add('catalog-item');

        card.innerHTML = `
          <img src="images/${category.image}" alt="${category.name}">
          <a href="category.html?categoryId=${category.id}">
            ${category.name}
          </a>
        `;

        catalogContainer.appendChild(card);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

function initMobileSidebar() {
  const sidebarTitles = document.querySelectorAll('.cart-box h3, .catalog h3');

  sidebarTitles.forEach((title) => {
    title.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        const parent = title.parentElement;
        parent.classList.toggle('active-mobile');
      }
    });
  });
}

window.addEventListener('DOMContentLoaded', initMobileSidebar);

loadCategories();

updateCartUI();
