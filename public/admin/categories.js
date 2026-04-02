const tableBody = document.querySelector('#categories-table tbody');

async function loadCategories() {
  try {
    const res = await fetch('/admin/categories');
    const categories = await res.json();
    tableBody.innerHTML = '';
    categories.forEach((cat) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cat.name}</td>
        <td><img src="/images/${cat.image}" alt="${cat.name}" width="50"></td>
        <td>
            <a href="category-edit.html?catId=${cat.id}">
                 <button class="edit-btn" data-id="${cat.id}">Редагувати</button>
            </a>
          <button class="delete-btn" data-id="${cat.id}">Видалити</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading categories', err);
  }
}

tableBody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.getAttribute('data-id');
    console.log(id);
    if (confirm('Ви впевнені, що хочете видалити цю категорію?')) {
      try {
        const res = await fetch(`/admin/categories/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await loadCategories();
        } else {
          const errorData = await res.json();
          alert('Помилка при видаленні: ' + (errorData.error || 'Невідома помилка'));
        }
      } catch (err) {
        console.error('Помилка при відправці запиту на видалення:', err);
        alert("Помилка з'єднання з сервером.");
      }
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

await loadCategories();
