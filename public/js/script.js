import { updateCartUI, addToCart, showToast } from './cart.js';
import { updateFavoritesUI } from './favorites.js';
import { isFavorite, toggleFavorite } from './favorites.js';

export function getOptimizedImg(url) {
  if (!url) return '';
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    // Вшиваем трансформации авто-формата (webp), авто-качества и ограничение ширины в 800px
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_800/');
  }
  return url;
}

export function createProductCard(product, isEager = false) {
  const isAvailable = product.total_stock > 0;
  const inFav = isFavorite(product.id);

  const optimizedImg = getOptimizedImg(product.image);

  const displayName = product.manufacturer_name
    ? `${product.name} ${product.manufacturer_name}`
    : product.name;

  const priceDisplay = product.price_retail
    ? `<div class="product-price">
         ${product.price_retail} <span>грн / ${product.unit}</span>
       </div>`
    : `<div class="product-price-empty">Ціна уточнюється</div>`;

  const card = document.createElement('div');
  card.classList.add('product-card');
  card.setAttribute('data-clarity-unmask', 'true');

  const imgAttributes = isEager ? 'fetchpriority="high"' : 'loading="lazy"';

  card.innerHTML = `
    <div class="fav-btn" data-id="${product.id}">${inFav ? '❤️' : '🤍'}</div>
    
    <a href="product.html?productId=${product.id}">
     <!-- <img src="${product.image}" alt="${product.name}"> -->
     <img src="${optimizedImg}" ${imgAttributes} width="250" height="250" alt="${product.name}">
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

        unit: product.unit || 'шт',

        // ПАРАМЕТРИ ДИНАМІЧНОГО ЦІНОУТВОРЕННЯ
        has_dynamic_pricing: product.has_dynamic_pricing,
        markup_tier1: product.markup_tier1,
        markup_tier2: product.markup_tier2,
        markup_tier3: product.markup_tier3,
        cut_fee: product.cut_fee,
      });
      updateCartUI();

      /*showToast(`${product.name} додано до кошика!`); */

      showToast(
        `${product.name} додано до кошика! <strong style="color: #FFD700; margin-left: 8px;">Перейти ➔</strong>`
      );

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

export async function loadCategories() {
  const catalogList = document.getElementById('catalog-list');
  const catalogContainer = document.getElementById('catalog-container');
  const mobileCatList = document.getElementById('mobile-categories-list');

  if (!catalogList && !catalogContainer && !mobileCatList) return;

  try {
    const res = await fetch('/categories');
    const categories = await res.json();

    const activeCategories = categories.filter((category) => category.product_count > 0);

    activeCategories.forEach((category) => {
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

        const optimizedCatImg = getOptimizedImg(category.image);

        card.innerHTML = `
          <!-- <img src="${category.image}" alt="${category.name}"> -->
          <img src="${optimizedCatImg}" loading="lazy" width="200" height="200" alt="${category.name}">
          <a href="category.html?categoryId=${category.id}">
            ${category.name}
          </a>
        `;

        catalogContainer.appendChild(card);
      }
      if (mobileCatList) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="category.html?categoryId=${category.id}">
            • ${category.name}
          </a>
        `;
        mobileCatList.appendChild(li);
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

function initMobileCategoriesToggle() {
  const toggleBtn = document.getElementById('mobile-cat-toggle');
  const catList = document.getElementById('mobile-categories-list');

  if (toggleBtn && catList) {
    toggleBtn.addEventListener('click', () => {
      catList.classList.toggle('collapsed');
      toggleBtn.classList.toggle('open');
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initMobileSidebar();
  initMobileCategoriesToggle();
});

updateCartUI();
updateFavoritesUI();
loadCategories();
