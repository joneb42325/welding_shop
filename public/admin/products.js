const tableBody = document.querySelector('#products-table tbody');

const urlParams = new URLSearchParams(window.location.search);
const categoryFilterId = urlParams.get('categoryId');

async function loadProducts() {
  try {
    let fetchUrl = '/admin/products';
    if (categoryFilterId) {
      fetchUrl += `?category_id=${categoryFilterId}`;
    }
    const res = await fetch(fetchUrl);
    const products = await res.json();
    const pageTitle = document.getElementById('page-title');

    if (categoryFilterId) {
      if (products.length > 0) {
        pageTitle.textContent = `Товари: ${products[0].category_name}`;
      } else {
        pageTitle.textContent = `Товари в обраній категорії`;
      }
    } else {
      pageTitle.textContent = `Всі товари`;
    }
    tableBody.innerHTML = '';

    const actionsDiv = document.querySelector('.admin-actions');

    if (categoryFilterId && !document.getElementById('clear-filter-btn')) {
      const clearBtn = document.createElement('a');
      clearBtn.href = 'products.html';
      clearBtn.innerHTML = `<button id="clear-filter-btn"  class="clear-filter-btn">✖ Показати всі товари</button>`;
      actionsDiv.appendChild(clearBtn);
    }

    if (products.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">У цій категорії ще немає товарів</td></tr>';
      return;
    }

    products.forEach(async (prod) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.name}</td>
        <td><img src="${prod.image}" width="50" style="border-radius:4px;"></td>
        <td>${prod.category_name || 'Без категорії'}</td>
        <td class="description-cell" title="${prod.description}">
            ${prod.description || 'Немає опису'}
        </td>
        <td id="options-status-${prod.id}" class="status-loading" onclick="location.href='product-option.html?productId=${prod.id}'">⏳ Перевірка...</td>
        <td>${prod.is_special ? '✅' : '-'}</td>
        <td>
          <button class="edit-btn" onclick="location.href='product-option.html?productId=${prod.id}'">До опцій</button>
          <button class="edit-btn" onclick="location.href='product-edit.html?id=${prod.id}'">Редагувати</button>
          <button class="delete-btn" data-id="${prod.id}">Видалити</button>
        </td>
      `;
      tableBody.appendChild(tr);

      try {
        const res = await fetch(`/admin/product-options/product/${prod.id}`);
        const options = await res.json();

        const statusCell = document.getElementById(`options-status-${prod.id}`);
        statusCell.classList.remove('status-loading');

        if (options && options.length > 0) {
          statusCell.innerHTML = `<span class="status-ok">✅ Є (${options.length})</span>`;
        } else {
          statusCell.innerHTML = `<span class="status-empty">❌ ПОРОЖНЬО</span>`;
        }
      } catch (err) {
        console.error(`Помилка завантаження опцій для товару ${prod.id}:`, err);
        const statusCell = document.getElementById(`options-status-${prod.id}`);
        if (statusCell) {
          statusCell.classList.remove('status-loading');
          statusCell.innerHTML = `<span class="status-error">Помилка</span>`;
        }
      }
    });
  } catch (err) {
    console.error('Помилка завантаження товарів:', err);
  }
}

tableBody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    if (confirm('Видалити цей товар?')) {
      const res = await fetch(`/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) await loadProducts();
    }
  }
});

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

await loadProducts();
