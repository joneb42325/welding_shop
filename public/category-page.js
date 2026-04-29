import { createProductCard } from './script.js';
import { updateCartUI } from './cart.js';

async function loadCategoryProducts() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('categoryId');
  const categoryContainer = document.getElementById('category-products-container');
  const categorySection = document.querySelector('.category-products');

  if (!categoryId || !categoryContainer) return;

  try {
    const res = await fetch(`/products/category/${categoryId}`);
    const products = await res.json();

    categoryContainer.innerHTML = '';

    const oldWrapper = document.querySelector('.empty-state-wrapper');
    if (oldWrapper) oldWrapper.remove();

    if (products.length === 0) {
      const emptyWrapper = document.createElement('div');
      emptyWrapper.className = 'empty-state-wrapper';
      emptyWrapper.innerHTML = `
        <div class="empty-message">
          <h2>У цій категорії поки немає товарів 😔</h2>
          <p>Ми вже працюємо над її наповненням. Загляньте сюди трохи пізніше!</p>
          <a href="index.html" class="btn-back">Повернутися на головну</a>
        </div>
      `;
      categorySection.appendChild(emptyWrapper);
      return;
    }

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
  const header = document.querySelector('.category-header');

  const categoryTitle = document.getElementById('category-title');
  if (!categoryTitle || !categoryId) return;

  try {
    const res = await fetch(`/categories/${categoryId}/info`);
    const category = await res.json();

    document.title = `${category.name} — Купити в Wolfram Shop`;
    //SEO
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = `Каталог продукції у категорії ${category.name}. Великий вибір зварювальних матеріалів за найкращими цінами.`;
    }
    categoryTitle.textContent = category.name;
    const bgUrl = category.image.startsWith('http') ? category.image : `images/${category.image}`;
    header.style.backgroundImage = `url('${bgUrl}')`;
  } catch (err) {
    console.error(err);
  }
}

async function init() {
  loadCategoryProducts();
  loadCategoryTitle();
  updateCartUI();
}
init();
