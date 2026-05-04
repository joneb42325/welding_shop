import { addToCart, updateCartUI } from './cart.js';

const params = new URLSearchParams(window.location.search);
const productId = params.get('productId');
const manufacturerContainer = document.getElementById('manufacturer-tables');
const descriptionSection = document.querySelector('.product-description');
const descriptionElement = document.getElementById('product-description');

if (productId && manufacturerContainer) {
  fetch(`/product-options/${productId}`)
    .then((res) => res.json())
    .then((data) => renderTables(data))
    .catch((err) => console.error(err));

  function renderTables(data) {
    const pricesSection = document.querySelector('.product-prices');
    manufacturerContainer.innerHTML = '';

    const existingEmptyMessage = document.querySelector('.empty-state-wrapper');
    if (existingEmptyMessage) existingEmptyMessage.remove();

    if (!data || data.length === 0) {
      manufacturerContainer.style.display = 'none';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state-wrapper';
      emptyDiv.innerHTML = `
        <div class="empty-message">
          <h2>Ціни та опції наразі оновлюються 🛠️</h2>
          <p>Ми вже працюємо над їх наповненням. Загляньте сюди трохи пізніше!</p>
          <a href="index.html" class="btn-back">Повернутися на головну</a>
        </div>
      `;

      pricesSection.appendChild(emptyDiv);
      return;
    }

    manufacturerContainer.style.display = '';

    const grouped = {};

    data.forEach((item) => {
      if (!grouped[item.manufacturer]) {
        grouped[item.manufacturer] = [];
      }
      grouped[item.manufacturer].push(item);
    });

    for (const manufacturer in grouped) {
      const section = document.createElement('div');
      section.classList.add('manufacturer-block');

      section.innerHTML = `
    <h3>${manufacturer}</h3>
    <table>
    <thead>
    <tr>
       <th>Діаметр</th>
            <th>Вага</th>
            <th>ЧП</th>
            <th>ТОВ</th>
            <th>Опт</th>
    </tr>
    </thead>
    <tbody></tbody>
    </table>
    `;

      const tbody = section.querySelector('tbody');

      grouped[manufacturer].forEach((item) => {
        const isAvailable = item.stock > 0;

        let selectedType = 'retail';
        const row = document.createElement('tr');
        if (!isAvailable) {
          row.classList.add('out-of-stock-row');
        }
        row.innerHTML = `
        <td>${item.diameter}</td>
        <td>${item.weight}</td>
        <td class="price-cell ${isAvailable ? 'active' : ''}" data-type="retail">${item.price_retail} грн</td>
        <td class="price-cell" data-type="company">${item.price_company} грн</td>
        <td class="price-cell" data-type="wholesale">${item.price_wholesale} грн</td>
        <td>
        <button class="add-to-cart" ${!isAvailable ? 'disabled' : ''}>
          ${isAvailable ? 'В кошик' : 'Немає в наявності'}
        </button>
        </td>
      `;
        if (isAvailable) {
          row.querySelectorAll('.price-cell').forEach((cell) => {
            cell.addEventListener('click', () => {
              selectedType = cell.dataset.type;
              row.querySelectorAll('.price-cell').forEach((c) => c.classList.remove('active'));
              cell.classList.add('active');
            });
          });

          row.querySelector('.add-to-cart').addEventListener('click', () => {
            const price = item[`price_${selectedType}`];
            showToast(`${currentProduct.name} додано до кошика!`);
            addToCart({
              productId,
              name: currentProduct.name,
              image: currentProduct.image,
              manufacturer: item.manufacturer,
              diameter: item.diameter,
              weight: item.weight,
              selectedType,
              price,
            });

            updateCartUI();
          });
        }
        tbody.appendChild(row);
      });
      manufacturerContainer.appendChild(section);
    }
  }

  let currentProduct = null;

  fetch(`/product/${productId}`)
    .then((res) => res.json())
    .then((product) => {
      currentProduct = product;
      document.title = `${product.name} — Купити в Wolfram Shop`;

      //SEO
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      const descText = product.description
        ? product.description.substring(0, 150).replace(/\n/g, ' ')
        : `Купити ${product.name} оптом та в роздріб.`;
      metaDesc.content = `${descText}... Найкращі ціни в Wolfram Shop.`;

      document.getElementById('product-name').textContent = product.name;
      if (product.description && product.description.trim() !== '') {
        descriptionElement.classList.add('product-description-text');
        descriptionElement.textContent = product.description;
        descriptionSection.style.display = 'block';
      } else {
        descriptionSection.style.display = 'none';
      }
      const productImg = document.getElementById('product-image');
      productImg.src = product.image.startsWith('http') ? product.image : 'images/' + product.image;
      productImg.alt = `Фото товару: ${product.name}`;
    });
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cursor = 'pointer';
  toast.innerHTML = `
    <span>🛒</span>
    <span>${message}</span>
  `;

  toast.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

updateCartUI();
