import { updateCartUI, addToCart } from './cart.js';
import { updateFavoritesUI } from './favorites.js';
import { isFavorite, toggleFavorite } from './favorites.js';

export function createProductCard(product) {
  const isAvailable = product.total_stock > 0;
  const inFav = isFavorite(product.id);

  const displayName = product.manufacturer_name
    ? `${product.name} ${product.manufacturer_name}`
    : product.name;

  const priceDisplay = product.price_retail
    ? `<div class="product-price">
         ${product.price_retail} <span>грн</span>
       </div>`
    : `<div class="product-price-empty">Ціна уточнюється</div>`;

  const card = document.createElement('div');
  card.classList.add('product-card');

  card.innerHTML = `
    <div class="fav-btn" data-id="${product.id}">${inFav ? '❤️' : '🤍'}</div>
    
    <a href="product.html?productId=${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <h3>${displayName}</h3>
    </a>
    <!--<p class="price">${priceDisplay}</p> -->
    <div class="price-wrapper">
      ${priceDisplay}
    </div>
    ${
      !isAvailable
        ? `<p class="out-of-stock">Немає в наявності</p>`
        : `<p><span class="available">В наявності</span></p>`
    }
    
    <button class="add-to-cart-btn" ${!isAvailable || !product.price_retail ? 'disabled' : ''}>
    ${isAvailable && product.price_retail ? '🛒 В кошик' : 'Недоступно'}
    </button>
  `;

  const cartBtn = card.querySelector('.add-to-cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      addToCart({
        productId: product.id,
        name: product.name,
        image: product.image,
        manufacturer: product.manufacturer_name || '',
        diameter: product.diameter || '',
        weight: product.weight || '',
        selectedType: 'retail', // За замовчуванням беремо роздріб
        price: product.price_retail,

        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        wholesale_threshold: product.wholesale_threshold,
      });
      updateCartUI();
      const originalText = cartBtn.innerHTML;
      cartBtn.innerHTML = '✅ Додано';
      cartBtn.classList.add('added');
      setTimeout(() => {
        cartBtn.innerHTML = originalText;
        cartBtn.classList.remove('added');
      }, 2000);
    });
  }

  const favBtn = card.querySelector('.fav-btn');
  favBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isAdded = toggleFavorite(product.id);
    favBtn.innerHTML = isAdded ? '❤️' : '🤍';
    favBtn.style.transform = 'scale(1.3)';
    setTimeout(() => (favBtn.style.transform = 'scale(1)'), 200);
  });

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
          <img src="${category.image}" alt="${category.name}">
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
updateFavoritesUI();
