import { addToCart, updateCartUI } from './cart.js';

const params = new URLSearchParams(window.location.search);
const productId = params.get('productId');
const manufacturerContainer = document.getElementById('manufacturer-tables');

if (productId && manufacturerContainer) {
  fetch(`/product-options/${productId}`)
    .then((res) => res.json())
    .then((data) => renderTables(data))
    .catch((err) => console.error(err));

  function renderTables(data) {
    manufacturerContainer.innerHTML = '';

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
        <td>${item.weight} кг</td>
        <td class="price-cell ${isAvailable ? 'active' : ''}" data-type="retail">${item.price_retail}</td>
        <td class="price-cell" data-type="company">${item.price_company}</td>
        <td class="price-cell" data-type="wholesale">${item.price_wholesale}</td>
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
            alert('Товар додан');
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
      document.getElementById('product-name').textContent = product.name;
      document.getElementById('product-description').textContent = product.description;
      document.getElementById('product-image').src = 'images/' + product.image;
    });
}

updateCartUI();
