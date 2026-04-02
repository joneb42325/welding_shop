const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('productId');
const tbody = document.querySelector('#options-table tbody');
const productNameEl = document.getElementById('product-name');

window.addEventListener('load', async () => {
  try {
    const res = await fetch('/admin/check');

    if (res.status === 401) {
      window.location.href = '/admin/login.html';
    }
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('add-btn').addEventListener('click', () => {
  window.location.href = `product-option-add.html?productId=${productId}`;
});

async function loadOptions() {
  try {
    const productRes = await fetch(`/admin/products/${productId}`);
    if (!productRes.ok) throw new Error('Продукт не знайдено');
    const product = await productRes.json();
    productNameEl.textContent = product.name;

    const res = await fetch(`/admin/product-options/product/${productId}`);
    const options = await res.json();

    tbody.innerHTML = '';
    if (options.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">Опцій немає</td></tr>';
      return;
    }

    options.forEach((opt) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${opt.manufacturer}</td>
        <td>${opt.diameter || ''}</td>
        <td>${opt.weight || ''}</td>
        <td>${opt.price_retail}</td>
        <td>${opt.price_company}</td>
        <td>${opt.price_wholesale}</td>
        <td>${opt.stock}</td>
        <td>
          <button onclick="editOption(${opt.id})">Редагувати</button>
          <button onclick="deleteOption(${opt.id})">Видалити</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="8">Помилка завантаження</td></tr>';
  }
}

function editOption(id) {
  window.location.href = `product-option-edit.html?id=${id}`;
}

async function deleteOption(id) {
  if (!confirm('Видалити опцію?')) return;
  const res = await fetch(`/admin/product-options/${id}`, { method: 'DELETE' });
  if (res.ok) loadOptions();
  else alert('Помилка видалення');
}

loadOptions();
