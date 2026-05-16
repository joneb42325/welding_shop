const tbody = document.querySelector('#orders-table tbody');
const modal = document.getElementById('items-modal');
const closeModal = document.querySelector('.close-modal');

async function checkAuth() {
  const res = await fetch('/admin/check');
  if (res.status === 401) window.location.href = '/admin/login.html';
}

// Завантаження замовлень
async function loadOrders() {
  try {
    const res = await fetch('/admin/orders');
    const orders = await res.json();
    tbody.innerHTML = '';

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Немає замовлень</td></tr>';
      return;
    }

    orders.forEach((order) => {
      const tr = document.createElement('tr');
      const date = new Date(order.created_at).toLocaleString('uk-UA');

      let statusClass = 'status-new';
      if (order.status === 'В обробці') statusClass = 'status-process';
      if (order.status === 'Відправлено') statusClass = 'status-sent';
      if (order.status === 'Виконано') statusClass = 'status-done';
      if (order.status === 'Скасовано') statusClass = 'status-cancel';

      tr.innerHTML = `
        <td><strong>${order.id}</strong><br><span class="order-date">${date}</span></td>
        <td>${order.customer_name}</td>
        <td>${order.customer_phone}<br><small>${order.customer_email || ''}</small></td>
        <td>${order.delivery_address}</td>
        <td><strong>${order.total_price} грн</strong></td>
        <td>
          <select class="status-select ${statusClass}" data-id="${order.id}">
            <option value="Нове" ${order.status === 'Нове' ? 'selected' : ''}>Нове</option>
            <option value="В обробці" ${order.status === 'В обробці' ? 'selected' : ''}>В обробці</option>
            <option value="Відправлено" ${order.status === 'Відправлено' ? 'selected' : ''}>Відправлено</option>
            <option value="Виконано" ${order.status === 'Виконано' ? 'selected' : ''}>Виконано</option>
            <option value="Скасовано" ${order.status === 'Скасовано' ? 'selected' : ''}>Скасовано</option>
          </select>
        </td>
        <td>
          <button class="view-btn" data-id="${order.id}" data-comment="${order.comment || 'Немає'}">Деталі</button>
          <button class="delete-btn-table" data-id="${order.id}">Видалити</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження замовлень');
  }
}

// Обробка кліків у таблиці (Деталі, Видалення, Зміна статусу)
tbody.addEventListener('click', async (e) => {
  // 1. ВИДАЛЕННЯ
  if (e.target.classList.contains('delete-btn-table')) {
    if (!confirm('Видалити це замовлення назавжди?')) return;
    const id = e.target.dataset.id;
    const res = await fetch(`/admin/orders/${id}`, { method: 'DELETE' });
    if (res.ok) loadOrders();
  }

  // 2. ПЕРЕГЛЯД ДЕТАЛЕЙ (ТОВАРІВ)
  if (e.target.classList.contains('view-btn')) {
    const id = e.target.dataset.id;
    const comment = e.target.dataset.comment;
    document.getElementById('modal-order-id').innerText = id;
    document.getElementById('modal-comment').innerText = comment;

    // Завантажуємо товари цього замовлення
    const res = await fetch(`/admin/orders/${id}/items`);
    const items = await res.json();

    const itemsBody = document.getElementById('modal-items-body');
    itemsBody.innerHTML = '';

    items.forEach((item) => {
      itemsBody.innerHTML += `
        <tr>
          <td><strong>${item.product_name}</strong></td>
          <td>${item.product_manufacturer} / ${item.diameter} / ${item.weight}</td>
          <td>${formatType(item.selected_type)}</td>
          <td>${item.price} x ${item.quantity} шт</td>
          <td><strong>${(item.price * item.quantity).toFixed(2)}</strong></td>
        </tr>
      `;
    });
    modal.classList.add('active');
  }
});

// 3. ЗМІНА СТАТУСУ (при зміні select)
tbody.addEventListener('change', async (e) => {
  if (e.target.classList.contains('status-select')) {
    const id = e.target.dataset.id;
    const newStatus = e.target.value;

    try {
      const res = await fetch(`/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        loadOrders();
      }
    } catch (err) {
      console.error(err);
      alert('Помилка оновлення статусу');
    }
  }
});

// Закриття модалки
closeModal.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

// Допоміжна функція для перекладу типу ціни
function formatType(type) {
  const types = { retail: 'ЧП (Роздріб)', company: 'ТОВ', wholesale: 'Опт' };
  return types[type] || type;
}

// Запуск
checkAuth().then(loadOrders);
