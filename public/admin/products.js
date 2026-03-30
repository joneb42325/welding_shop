const tableBody = document.querySelector('#products-table tbody');

async function loadProducts() {
  try {
    const res = await fetch('/admin/products');
    const products = await res.json();
    console.log('Данні з сервера:', products);
    tableBody.innerHTML = '';

    products.forEach((prod) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.id}</td>
        <td>${prod.name}</td>
        <td><img src="/images/${prod.image}" width="50" style="border-radius:4px;"></td>
        <td>${prod.category_name || 'Без категорії'}</td>
        <td>${prod.description}</td>
        <td>${prod.is_special ? '✅' : '-'}</td>
        <td>
          <button class="edit-btn" onclick="location.href='product-edit.html?id=${prod.id}'">Редагувати</button>
          <button class="delete-btn" data-id="${prod.id}">Видалити</button>
        </td>
      `;
      tableBody.appendChild(tr);
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

await loadProducts();
