// /public/js/product-option-edit.js
const params = new URLSearchParams(window.location.search);
const formEdit = document.getElementById('edit-option-form');
const manufacturerSelectEdit = document.getElementById('manufacturer');

let optionId = params.get('id');
let option = null;

async function loadData() {
  try {
    const [manufacturersRes, optionRes] = await Promise.all([
      fetch('/admin/manufacturers'),
      fetch('/admin/product-options/edit/' + optionId),
    ]);

    if (!manufacturersRes.ok || !optionRes.ok) throw new Error('Помилка завантаження');

    const manufacturers = await manufacturersRes.json();
    option = await optionRes.json();

    manufacturerSelectEdit.innerHTML = '';
    manufacturers.forEach((m) => {
      const optEl = document.createElement('option');
      optEl.value = m.id;
      optEl.textContent = m.name;
      if (m.id === option.manufacturer_id) optEl.selected = true;
      manufacturerSelectEdit.appendChild(optEl);
    });

    document.getElementById('diameter').value = option.diameter || '';
    document.getElementById('weight').value = option.weight || '';
    document.getElementById('price_retail').value = option.price_retail || 0;
    document.getElementById('price_company').value = option.price_company || 0;
    document.getElementById('price_wholesale').value = option.price_wholesale || 0;
    document.getElementById('stock').value = option.stock || 0;
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження даних');
  }
}

// Відправка форми редагування
formEdit.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    manufacturer_id: manufacturerSelectEdit.value,
    diameter: document.getElementById('diameter').value,
    weight: document.getElementById('weight').value,
    price_retail: parseFloat(document.getElementById('price_retail').value) || 0,
    price_company: parseFloat(document.getElementById('price_company').value) || 0,
    price_wholesale: parseFloat(document.getElementById('price_wholesale').value) || 0,
    stock: parseInt(document.getElementById('stock').value) || 0,
  };

  try {
    const res = await fetch(`/admin/product-options/${optionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Помилка при збереженні');

    alert('Опцію оновлено');
    window.location.href = 'product-option.html?productId=' + option.product_id;
  } catch (err) {
    console.error(err);
    alert('Помилка при оновленні опції');
  }
});

// Запуск
loadData();
