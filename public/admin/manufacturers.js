const form = document.getElementById('manufacturer-form');
const idInput = document.getElementById('manufacturer-id');
const nameInput = document.getElementById('manufacturer-name');
const cancelBtn = document.getElementById('cancel-btn');
const tableBody = document.getElementById('manufacturer-table-body');

async function loadManufacturers() {
  try {
    const res = await fetch('/admin/manufacturers');
    if (!res.ok) throw new Error('Не вдалося завантажити виробників');
    const manufacturers = await res.json();

    tableBody.innerHTML = '';
    manufacturers.forEach((m) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.name}</td>
        <td>
          <button class="edit-btn" data-id="${m.id}" data-name="${m.name}">Редагувати</button>
          <button class="delete-btn" data-id="${m.id}">Видалити</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження виробників');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = idInput.value;
  const name = nameInput.value.trim();
  if (!name) return alert('Введіть назву виробника');

  try {
    let res;
    if (id) {
      // Редагування
      res = await fetch(`/admin/manufacturers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } else {
      res = await fetch('/admin/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    }

    const result = await res.json();
    if (res.ok && result.success) {
      loadManufacturers();
      form.reset();
      idInput.value = '';
    } else {
      alert('Помилка: ' + (result.error || 'невідома'));
    }
  } catch (err) {
    console.error(err);
    alert('Помилка при збереженні');
  }
});

cancelBtn.addEventListener('click', () => {
  form.reset();
  idInput.value = '';
});

tableBody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('edit-btn')) {
    idInput.value = e.target.dataset.id;
    nameInput.value = e.target.dataset.name;
  }

  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    if (confirm('Ви дійсно хочете видалити цього виробника?')) {
      try {
        const res = await fetch(`/admin/manufacturers/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok && result.success) {
          loadManufacturers();
        } else {
          alert('Помилка видалення: ' + (result.error || 'невідома'));
        }
      } catch (err) {
        console.error(err);
        alert('Помилка при видаленні');
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

loadManufacturers();
