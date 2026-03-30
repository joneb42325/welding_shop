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

async function loadCategoryProducts() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('categoryId');
  const categoryContainer = document.getElementById('category-products-container');

  if (!categoryId || !categoryContainer) return;

  try {
    const res = await fetch(`/products/category/${categoryId}`);
    const products = await res.json();

    categoryContainer.innerHTML = '';

    products.forEach((product) => {
      categoryContainer.appendChild(createProductCard(product));
    });
  } catch (err) {
    console.error('Error loading products', err);
  }
}

async function loadCategoryTitle() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('categoryId');

  const categoryTitle = document.getElementById('category-title');
  if (!categoryTitle || !categoryId) return;

  try {
    const res = await fetch(`/categories/${categoryId}/info`);
    const category = await res.json();

    categoryTitle.textContent = category.name;
  } catch (err) {
    console.error(err);
  }
}

function createProductCard(product) {
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

loadSpecialProducts();
loadCategoryProducts();
loadCategoryTitle();
loadCategories();

updateCartUI();
