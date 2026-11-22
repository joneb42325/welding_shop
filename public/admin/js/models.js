const form = document.getElementById('model-form');
const idInput = document.getElementById('model-id');
const nameInput = document.getElementById('model-name');
const cancelBtn = document.getElementById('cancel-btn');
const tableBody = document.getElementById('model-table-body');

async function loadModels() {
  try {
    const res = await fetch('/admin/models');
    if (!res.ok) throw new Error('Не вдалося завантажити лінійки');
    const models = await res.json();

    tableBody.innerHTML = '';
    models.forEach((m) => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = m.name;

      const actionsTd = document.createElement('td');

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Редагувати';
      editBtn.dataset.id = m.id;
      editBtn.dataset.name = m.name;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Видалити';
      deleteBtn.dataset.id = m.id;

      actionsTd.append(editBtn, ' ', deleteBtn);
      tr.append(nameTd, actionsTd);
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження лінійок');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = idInput.value;
  const name = nameInput.value.trim();
  if (!name) return alert('Введіть назву лінійки');

  try {
    const url = id ? `/admin/models/${id}` : '/admin/models';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const result = await res.json();
    if (res.ok && result.success) {
      await loadModels();
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
    nameInput.focus();
  }

  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    if (confirm('Ви дійсно хочете видалити цю лінійку?')) {
      try {
        const res = await fetch(`/admin/models/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok && result.success) {
          await loadModels();
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

loadModels();
