const tbody = document.querySelector('#orders-table tbody');
const modal = document.getElementById('items-modal');
const closeModal = document.querySelector('.close-modal');

const editFields = document.getElementById('modal-edit-fields');
const editActions = document.getElementById('modal-edit-actions');
const commentView = document.getElementById('modal-comment-view');

const saveOrderBtn = document.getElementById('save-order-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

let currentOrderId = null;
let currentOrderItems = [];

function calcItemSaleSum(item) {
  const price = Number(item.price) || 0;
  const qty = Number(item.quantity) || 0;
  const cutFee = Number(item.cut_fee) || 0;
  return price * qty + cutFee;
}

function calcItemPurchaseSum(item) {
  const purchasePrice = Number(item.purchase_price) || 0;
  const qty = Number(item.quantity) || 0;
  return purchasePrice * qty;
}

function updatePayoutSummary(orders = []) {
  const amountEl = document.getElementById('payout-due-amount');
  const countEl = document.getElementById('payout-orders-count');
  if (!amountEl) return;

  let totalDue = 0;
  let countedOrders = 0;

  orders.forEach((order) => {
    const status = String(order.status || '').trim();
    const totalPrice = Number(order.total_price) || 0;
    const totalPurchase = Number(order.total_purchase_cost) || 0;

    // Не учитываем уже оплаченные ("Виконано 💰") и отменённые ("Скасовано")
    if (status === 'Виконано 💰' || status === 'Скасовано') return;

    // Учитываем только заказы, где закупка реально введена
    if (totalPurchase <= 0) return;

    const netProfit = totalPrice - totalPurchase;
    const share25 = netProfit * 0.25;

    totalDue += share25;
    countedOrders++;
  });

  amountEl.textContent = totalDue.toFixed(2);
  if (countEl) {
    countEl.textContent = `(замовлень: ${countedOrders})`;
  }
}

function updateProfitSummary() {
  const totalSale = currentOrderItems.reduce((sum, item) => sum + calcItemSaleSum(item), 0);
  const totalCost = currentOrderItems.reduce((sum, item) => sum + calcItemPurchaseSum(item), 0);
  const netProfit = totalSale - totalCost;
  const myShare25 = netProfit * 0.25;

  const saleEl = document.getElementById('profit-total-sale');
  const costEl = document.getElementById('profit-total-cost');
  const netEl = document.getElementById('profit-net');
  const shareEl = document.getElementById('profit-share-25');

  if (saleEl) saleEl.textContent = totalSale.toFixed(2);
  if (costEl) costEl.textContent = totalCost.toFixed(2);
  if (netEl) netEl.textContent = netProfit.toFixed(2);
  if (shareEl) shareEl.textContent = myShare25.toFixed(2);
}

saveOrderBtn.addEventListener('click', async () => {
  if (!currentOrderId) {
    alert('Замовлення не вибрано');
    return;
  }

  const customerName = document.getElementById('edit-customer-name').value.trim();
  const customerPhone = document.getElementById('edit-customer-phone').value.trim();
  const customerEmail = document.getElementById('edit-customer-email').value.trim();
  const deliveryAddress = document.getElementById('edit-delivery-address').value.trim();
  const comment = document.getElementById('edit-comment').value;

  if (!customerName || !customerPhone) {
    alert("Вкажіть ім'я та телефон клієнта");
    return;
  }

  if (currentOrderItems.length === 0) {
    alert('У замовленні має залишитися хоча б один товар');
    return;
  }

  const items = currentOrderItems.map((item) => ({
    product_id: Number(item.product_id),
    price: Number(item.price),
    purchase_price: Number(item.purchase_price) || 0,
    cut_fee: Number(item.cut_fee) || 0,
    quantity: Number(item.quantity),
    selected_type: item.selected_type || 'retail',
  }));

  const invalidItem = items.some(
    (item) =>
      !Number.isInteger(item.product_id) ||
      item.product_id <= 0 ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      !Number.isFinite(item.purchase_price) ||
      item.purchase_price < 0 ||
      !Number.isFinite(item.cut_fee) ||
      item.cut_fee < 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
  );

  if (invalidItem) {
    alert('Перевірте ціни, закупівлю та кількість товарів');
    return;
  }

  saveOrderBtn.disabled = true;
  saveOrderBtn.textContent = 'Збереження...';

  try {
    const response = await fetch(`/admin/orders/${currentOrderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: deliveryAddress,
        comment,
        items,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Не вдалося зберегти замовлення');
    }

    alert(`Замовлення збережено. Сума: ${Number(result.total_price).toFixed(2)} грн`);

    setModalMode(false);
    modal.classList.remove('active');

    currentOrderId = null;
    currentOrderItems = [];

    await loadOrders();
  } catch (error) {
    console.error('Помилка збереження замовлення:', error);
    alert(error.message || 'Помилка збереження замовлення');
  } finally {
    saveOrderBtn.disabled = false;
    saveOrderBtn.textContent = 'Зберегти зміни';
  }
});

cancelEditBtn.addEventListener('click', () => {
  setModalMode(false);
  modal.classList.remove('active');

  currentOrderId = null;
  currentOrderItems = [];
});

async function checkAuth() {
  const res = await fetch('/admin/check');
  if (res.status === 401) window.location.href = '/admin/login.html';
}

function setModalMode(isEditing) {
  editFields.hidden = !isEditing;
  editActions.hidden = !isEditing;
  commentView.hidden = isEditing;
}

async function openOrderEditor(orderId) {
  try {
    const ordersResponse = await fetch('/admin/orders');

    if (!ordersResponse.ok) {
      throw new Error('Не вдалося завантажити замовлення');
    }

    const orders = await ordersResponse.json();
    const order = orders.find((item) => String(item.id) === String(orderId));

    if (!order) {
      throw new Error('Замовлення не знайдено');
    }

    const itemsResponse = await fetch(`/admin/orders/${orderId}/items`);

    if (!itemsResponse.ok) {
      throw new Error('Не вдалося завантажити товари');
    }

    const items = await itemsResponse.json();

    currentOrderId = orderId;
    currentOrderItems = items.map((item) => ({
      ...item,
      cut_fee: Number(item.cut_fee) || 0,
      purchase_price: Number(item.purchase_price) || 0,
    }));

    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('edit-customer-name').value = order.customer_name || '';
    document.getElementById('edit-customer-phone').value = order.customer_phone || '';
    document.getElementById('edit-customer-email').value = order.customer_email || '';
    document.getElementById('edit-delivery-address').value = order.delivery_address || '';
    document.getElementById('edit-comment').value = order.comment || '';

    renderOrderItems(true);
    setModalMode(true);
    modal.classList.add('active');
  } catch (error) {
    console.error(error);
    alert('Не вдалося відкрити замовлення для редагування');
  }
}

function renderOrderItems(isEditing = false) {
  const itemsBody = document.getElementById('modal-items-body');
  itemsBody.replaceChildren();

  currentOrderItems.forEach((item, index) => {
    const row = document.createElement('tr');
    const cutFee = Number(item.cut_fee) || 0;
    const purchasePrice = Number(item.purchase_price) || 0;
    const itemCostSum = calcItemPurchaseSum(item);
    const itemSaleSum = calcItemSaleSum(item);

    if (!isEditing) {
      const name = document.createElement('td');
      name.textContent = item.product_name || '';

      const options = document.createElement('td');
      options.textContent = [item.product_manufacturer, item.diameter, item.weight]
        .filter(Boolean)
        .join(' / ');

      const type = document.createElement('td');
      type.textContent = formatType(item.selected_type);

      const priceQuantity = document.createElement('td');
      const cutLabel = cutFee > 0 ? ` (+ порізка ${cutFee.toFixed(2)} грн)` : '';
      priceQuantity.textContent = `${item.price} × ${item.quantity} шт${cutLabel}`;

      const purchaseCell = document.createElement('td');
      purchaseCell.textContent = `${purchasePrice.toFixed(2)} (разом: ${itemCostSum.toFixed(2)})`;

      const sum = document.createElement('td');
      sum.textContent = itemSaleSum.toFixed(2);

      row.append(name, options, type, priceQuantity, purchaseCell, sum);
    } else {
      const name = document.createElement('td');
      name.textContent = item.product_name || '';

      const options = document.createElement('td');
      options.textContent = [item.product_manufacturer, item.diameter, item.weight]
        .filter(Boolean)
        .join(' / ');

      const type = document.createElement('td');
      const typeSelect = document.createElement('select');

      ['retail', 'company', 'wholesale'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = formatType(value);
        option.selected = value === item.selected_type;
        typeSelect.appendChild(option);
      });

      typeSelect.addEventListener('change', () => {
        currentOrderItems[index].selected_type = typeSelect.value;
      });

      type.appendChild(typeSelect);

      const priceQuantity = document.createElement('td');

      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.min = '0';
      priceInput.step = '0.01';
      priceInput.value = item.price;

      priceInput.addEventListener('change', () => {
        currentOrderItems[index].price = Number(priceInput.value);
        renderOrderItems(true);
      });

      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.value = item.quantity;

      quantityInput.addEventListener('change', () => {
        currentOrderItems[index].quantity = Number(quantityInput.value);
        renderOrderItems(true);
      });

      const cutFeeInput = document.createElement('input');
      cutFeeInput.type = 'number';
      cutFeeInput.min = '0';
      cutFeeInput.step = '0.01';
      cutFeeInput.title = 'Порізка (грн)';
      cutFeeInput.placeholder = 'Порізка';
      cutFeeInput.value = cutFee;

      cutFeeInput.addEventListener('change', () => {
        currentOrderItems[index].cut_fee = Math.max(0, Number(cutFeeInput.value) || 0);
        renderOrderItems(true);
      });

      priceQuantity.append(
        priceInput,
        document.createTextNode(' × '),
        quantityInput,
        document.createTextNode(' + порізка: '),
        cutFeeInput
      );

      const purchaseCell = document.createElement('td');
      const purchaseInput = document.createElement('input');
      purchaseInput.type = 'number';
      purchaseInput.min = '0';
      purchaseInput.step = '0.01';
      purchaseInput.title = 'Закупівельна ціна за одиницю (грн)';
      purchaseInput.placeholder = 'Закупка';
      purchaseInput.value = purchasePrice;

      purchaseInput.addEventListener('change', () => {
        currentOrderItems[index].purchase_price = Math.max(0, Number(purchaseInput.value) || 0);
        renderOrderItems(true);
      });

      const costTotalLabel = document.createElement('div');
      costTotalLabel.style.fontSize = '12px';
      costTotalLabel.textContent = `Разом: ${itemCostSum.toFixed(2)} грн`;

      purchaseCell.append(purchaseInput, costTotalLabel);

      const sum = document.createElement('td');
      sum.textContent = itemSaleSum.toFixed(2);

      const removeCell = document.createElement('td');
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = 'Видалити';

      removeButton.addEventListener('click', () => {
        currentOrderItems.splice(index, 1);
        renderOrderItems(true);
      });

      removeCell.appendChild(removeButton);
      row.append(name, options, type, priceQuantity, purchaseCell, sum, removeCell);
    }

    itemsBody.appendChild(row);
  });

  updateProfitSummary();
}

const productSearch = document.getElementById('product-search');
const productSearchResults = document.getElementById('product-search-results');

let productSearchController = null;

productSearch.addEventListener('input', async () => {
  const search = productSearch.value.trim();

  if (productSearchController) {
    productSearchController.abort();
    productSearchController = null;
  }

  productSearchResults.replaceChildren();

  if (search.length < 2) {
    return;
  }

  const loading = document.createElement('p');
  loading.textContent = 'Пошук товарів...';
  productSearchResults.appendChild(loading);

  const controller = new AbortController();
  productSearchController = controller;

  try {
    const response = await fetch(`/admin/products/search?q=${encodeURIComponent(search)}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Не вдалося знайти товари');
    }

    const products = await response.json();

    if (productSearchController !== controller) return;

    productSearchResults.replaceChildren();

    if (products.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Товарів не знайдено';
      productSearchResults.appendChild(empty);
      return;
    }

    products.forEach((product) => {
      const result = document.createElement('div');
      result.className = 'product-search-result';

      const info = document.createElement('div');
      info.className = 'product-search-info';

      const name = document.createElement('strong');
      name.textContent = product.name;

      const details = document.createElement('p');
      details.textContent = [
        product.manufacturer_name,
        product.diameter ? `Ø ${product.diameter}` : '',
        product.weight ? `Вага: ${product.weight}` : '',
      ]
        .filter(Boolean)
        .join(' / ');

      const price = document.createElement('p');
      price.textContent = `Ціна в каталозі: ${Number(product.price_retail || 0).toFixed(2)} грн`;

      info.append(name, details, price);

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.textContent = 'Додати';

      addButton.addEventListener('click', () => {
        const existingItem = currentOrderItems.find(
          (item) => Number(item.product_id) === Number(product.id)
        );

        if (existingItem) {
          alert('Цей товар уже є в замовленні');
          return;
        }

        currentOrderItems.push({
          product_id: Number(product.id),
          product_name: product.name,
          product_manufacturer: product.manufacturer_name || '',
          diameter: product.diameter || '',
          weight: product.weight || '',
          price: Number(product.price_retail || 0),
          purchase_price: 0,
          cut_fee: 0,
          quantity: 1,
          selected_type: 'retail',
        });

        renderOrderItems(true);
        alert(`Товар "${product.name}" додано до замовлення`);

        productSearch.value = '';
        productSearchResults.replaceChildren();
      });

      result.append(info, addButton);
      productSearchResults.appendChild(result);
    });
  } catch (error) {
    if (error.name === 'AbortError') return;

    console.error('Помилка пошуку товарів:', error);

    productSearchResults.replaceChildren();

    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Помилка пошуку. Спробуйте ще раз.';
    productSearchResults.appendChild(errorMessage);
  }
});

// Завантаження замовлень
async function loadOrders() {
  try {
    const res = await fetch('/admin/orders');
    const orders = await res.json();
    updatePayoutSummary(orders);
    tbody.innerHTML = '';

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Немає замовлень</td></tr>';
      return;
    }

    orders.forEach((order) => {
      const tr = document.createElement('tr');
      const date = new Date(order.created_at).toLocaleString('uk-UA');
      const totalPrice = Number(order.total_price) || 0;
      const totalPurchase = Number(order.total_purchase_cost) || 0;
      const hasPurchase = totalPurchase > 0;
      const netProfit = totalPrice - totalPurchase;
      const share25 = netProfit * 0.25;
      const share75 = netProfit * 0.75;

      const splitHtml = hasPurchase
        ? `<br><small style="color: #666; font-size: 12px; white-space: nowrap;">${share25.toFixed(2)} / ${share75.toFixed(2)}</small>`
        : '';

      let statusClass = 'status-new';
      if (order.status === 'В обробці') statusClass = 'status-process';
      if (order.status === 'Відправлено') statusClass = 'status-sent';
      if (order.status === 'Виконано' || order.status === 'Виконано 💰') {
        statusClass = 'status-done';
      }
      if (order.status === 'Скасовано') statusClass = 'status-cancel';

      tr.innerHTML = `
        <td><strong>${order.id}</strong><br><span class="order-date">${date}</span></td>
        <td>${order.customer_name}</td>
        <td>${order.customer_phone}<br><small>${order.customer_email || ''}</small></td>
        <td>${order.delivery_address}</td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <input
              type="text"
              class="ttn-input"
              data-id="${order.id}"
              value="${order.ttn || ''}"
              placeholder="Номер ТТН"
              style="width: 135px; padding: 4px;"
            />
            <button type="button" class="save-ttn-btn" data-id="${order.id}">OK</button>
            ${order.ttn ? `<button type="button" class="copy-ttn-btn" data-id="${order.id}" title="Скопіювати ТТН">📋</button>` : ''}
          </div>
        </td>
        <td><strong>${Number(order.total_price).toFixed(2)} грн</strong>${splitHtml}</td>
        <td>
          <select class="status-select ${statusClass}" data-id="${order.id}">
            <option value="Нове" ${order.status === 'Нове' ? 'selected' : ''}>Нове</option>
            <option value="В обробці" ${order.status === 'В обробці' ? 'selected' : ''}>В обробці</option>
            <option value="Відправлено" ${order.status === 'Відправлено' ? 'selected' : ''}>Відправлено</option>
            <option value="Виконано" ${order.status === 'Виконано' ? 'selected' : ''}>Виконано</option>
            <option value="Виконано 💰" ${
              order.status === 'Виконано 💰' ? 'selected' : ''
            }>Виконано 💰</option>
            <option value="Скасовано" ${order.status === 'Скасовано' ? 'selected' : ''}>Скасовано</option>
          </select>
        </td>
        <td>
          <button class="view-btn" data-id="${order.id}" data-comment="${order.comment || 'Немає'}">Деталі</button>
          <button class="edit-btn-table" data-id="${order.id}">Редагувати</button>
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

// Обробка кліків у таблиці (Деталі, Видалення, Збереження ТТН)
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

    const res = await fetch(`/admin/orders/${id}/items`);
    const items = await res.json();

    currentOrderItems = items.map((item) => ({
      ...item,
      cut_fee: Number(item.cut_fee) || 0,
      purchase_price: Number(item.purchase_price) || 0,
    }));

    const itemsBody = document.getElementById('modal-items-body');
    itemsBody.innerHTML = '';

    items.forEach((item) => {
      const cutFee = Number(item.cut_fee) || 0;
      const purchasePrice = Number(item.purchase_price) || 0;
      const itemCostSum = purchasePrice * (Number(item.quantity) || 0);
      const cutText = cutFee > 0 ? ` <small>(+ порізка ${cutFee.toFixed(2)} грн)</small>` : '';
      const itemSum = (Number(item.price) || 0) * (Number(item.quantity) || 0) + cutFee;

      itemsBody.innerHTML += `
        <tr>
          <td><strong>${item.product_name}</strong></td>
          <td>${item.product_manufacturer} / ${item.diameter} / ${item.weight}</td>
          <td>${formatType(item.selected_type)}</td>
          <td>${item.price} x ${item.quantity} шт ${cutText}</td>
          <td>${purchasePrice.toFixed(2)} (разом: ${itemCostSum.toFixed(2)})</td>
          <td><strong>${itemSum.toFixed(2)}</strong></td>
        </tr>
      `;
    });

    updateProfitSummary();
    setModalMode(false);
    modal.classList.add('active');
  }

  const editButton = e.target.closest('.edit-btn-table');

  if (editButton) {
    const orderId = editButton.dataset.id;
    await openOrderEditor(orderId);
    return;
  }

  if (e.target.classList.contains('save-ttn-btn')) {
    const id = e.target.dataset.id;
    const input = tbody.querySelector(`.ttn-input[data-id="${id}"]`);
    const ttn = input ? input.value.trim() : '';

    e.target.disabled = true;
    try {
      const res = await fetch(`/admin/orders/${id}/ttn`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttn }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Не вдалося зберегти ТТН');
        return;
      }

      await loadOrders();
    } catch (err) {
      console.error(err);
      alert('Помилка збереження ТТН');
    } finally {
      e.target.disabled = false;
    }
  }

  if (e.target.classList.contains('copy-ttn-btn')) {
    const id = e.target.dataset.id;
    const input = tbody.querySelector(`.ttn-input[data-id="${id}"]`);
    const ttn = input ? input.value.trim() : '';
    if (!ttn) return;

    const copied = copyTextToClipboard(ttn);
    if (copied) {
      const prevText = e.target.textContent;
      e.target.textContent = '✓';
      setTimeout(() => {
        e.target.textContent = prevText;
      }, 1200);
    } else {
      alert('Не вдалося скопіювати ТТН');
    }
    return;
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

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback ниже
  }

  const tempInput = document.createElement('input');
  tempInput.value = text;
  tempInput.setAttribute('readonly', '');
  tempInput.style.position = 'fixed';
  tempInput.style.left = '-9999px';
  document.body.appendChild(tempInput);
  tempInput.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(tempInput);
  return ok;
}

// Запуск
checkAuth().then(loadOrders);
