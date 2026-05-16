const params = new URLSearchParams(window.location.search);
const form = document.getElementById('add-option-form');
const manufacturerSelect = document.getElementById('manufacturer');
const productId = params.get('productId');

// Завантажуємо список виробників
async function loadManufacturers() {
  try {
    const res = await fetch('/admin/manufacturers');
    if (!res.ok) throw new Error('Не вдалося завантажити виробників');

    const manufacturers = await res.json();
    manufacturerSelect.innerHTML = '';
    manufacturers.forEach((m) => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      manufacturerSelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження виробників');
  }
}

// Відправка форми
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    product_id: productId,
    manufacturer_id: manufacturerSelect.value,
    diameter: document.getElementById('diameter').value,
    weight: document.getElementById('weight').value,
    price_retail: parseFloat(document.getElementById('price_retail').value) || 0,
    price_company: parseFloat(document.getElementById('price_company').value) || 0,
    price_wholesale: parseFloat(document.getElementById('price_wholesale').value) || 0,
    stock: parseInt(document.getElementById('stock').value) || 0,
  };

  try {
    const res = await fetch('/admin/product-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Помилка при додаванні опції');

    alert('Опцію додано успішно');
    window.location.href = 'product-option.html?productId=' + data.product_id;
  } catch (err) {
    console.error(err);
    alert('Помилка при додаванні опції');
  }
});

// Запуск
loadManufacturers();
