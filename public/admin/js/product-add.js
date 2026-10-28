const categorySelect = document.getElementById('category-select');
const productForm = document.getElementById('product-form');
const imageInput = document.getElementById('image-input');
const preview = document.getElementById('preview');
const manufacturerSelect = document.getElementById('manufacturer-select');

async function loadCategories() {
  try {
    const res = await fetch('/admin/categories');
    const categories = await res.json();
    console.log(categories);
    categorySelect.innerHTML = '<option value="">Оберіть категорію</option>';
    categories.forEach((cat) => {
      categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

async function loadManufacturers() {
  try {
    const res = await fetch('/admin/manufacturers');
    const manufacturers = await res.json();

    manufacturerSelect.innerHTML = '<option value="">Оберіть виробника</option>';
    manufacturers.forEach((m) => {
      manufacturerSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
  } catch (err) {
    console.error('Error loading manufacturers:', err);
  }
}

imageInput.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(productForm);

  const categoryId = formData.get('category_id');

  const res = await fetch('/admin/products', {
    method: 'POST',
    body: formData,
  });

  if (res.ok) {
    if (categoryId) {
      window.location.href = `products.html?categoryId=${categoryId}`;
    } else {
      window.location.href = 'products.html';
    }
  } else {
    alert('Помилка при збереженні товару');
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

const dynamicCheckbox = document.getElementById('has_dynamic_pricing');
const dynamicSettings = document.getElementById('dynamic-pricing-settings');

if (dynamicCheckbox && dynamicSettings) {
  dynamicCheckbox.addEventListener('change', (e) => {
    dynamicSettings.style.display = e.target.checked ? 'block' : 'none';
  });
}

// Разбор URL параметров
const urlParams = new URLSearchParams(window.location.search);
const duplicateId = urlParams.get('duplicateId');

// После загрузки категорий и производителей проверяем, есть ли ID для дублирования
async function checkDuplicateMode() {
  if (!duplicateId) return;

  try {
    const res = await fetch(`/admin/products/${duplicateId}`);
    if (!res.ok) return;

    const prod = await res.json();

    // Меняем заголовок страницы для наглядности
    document.querySelector('h2').textContent = `Дублювання товару: ${prod.name}`;

    // Заполняем поля формы
    productForm.querySelector('[name="name"]').value = `${prod.name} (копія)`;
    productForm.querySelector('[name="category_id"]').value = prod.category_id || '';
    productForm.querySelector('[name="manufacturer_id"]').value = prod.manufacturer_id || '';
    productForm.querySelector('[name="diameter"]').value = prod.diameter || '';
    productForm.querySelector('[name="weight"]').value = prod.weight || '';
    productForm.querySelector('[name="price_retail"]').value = prod.price_retail || 0;
    productForm.querySelector('[name="price_company"]').value = prod.price_company || 0;
    productForm.querySelector('[name="price_wholesale"]').value = prod.price_wholesale || 0;
    productForm.querySelector('[name="unit"]').value = prod.unit || 'шт';
    productForm.querySelector('[name="wholesale_threshold"]').value =
      prod.wholesale_threshold || 50;
    productForm.querySelector('[name="stock"]').value = prod.stock || 100;
    productForm.querySelector('[name="description"]').value = prod.description || '';

    if (prod.is_special) {
      productForm.querySelector('[name="is_special"]').checked = true;
    }

    // Заполнение настроек динамической цены (наценок)
    if (prod.has_dynamic_pricing) {
      const dynamicCb = document.getElementById('has_dynamic_pricing');
      const dynamicSettings = document.getElementById('dynamic-pricing-settings');

      if (dynamicCb) dynamicCb.checked = true;
      if (dynamicSettings) dynamicSettings.style.display = 'block';

      if (prod.markup_tier1)
        productForm.querySelector('[name="markup_tier1"]').value = prod.markup_tier1;
      if (prod.markup_tier2)
        productForm.querySelector('[name="markup_tier2"]').value = prod.markup_tier2;
      if (prod.markup_tier3)
        productForm.querySelector('[name="markup_tier3"]').value = prod.markup_tier3;
      if (prod.cut_fee) productForm.querySelector('[name="cut_fee"]').value = prod.cut_fee;
    }

    // Показываем изображение оригинала в превью
    if (prod.image) {
      preview.src = prod.image.startsWith('http') ? prod.image : `/images/${prod.image}`;
      preview.classList.remove('hidden');

      // Делаем загрузку нового файла необязательной, если картинка остаётся той же
      imageInput.removeAttribute('required');

      // Передаем URL старой картинки в скрытое поле (на случай, если новое фото не загрузят)
      let hiddenImg = document.getElementById('existing-image');
      if (!hiddenImg) {
        hiddenImg = document.createElement('input');
        hiddenImg.type = 'hidden';
        hiddenImg.id = 'existing-image';
        hiddenImg.name = 'existing_image';
        productForm.appendChild(hiddenImg);
      }
      hiddenImg.value = prod.image;
    }
  } catch (err) {
    console.error('Помилка завантаження даних для дублювання:', err);
  }
}

// Запускаем проверку после загрузки всех селектов
Promise.all([loadCategories(), loadManufacturers()]).then(() => {
  checkDuplicateMode();
});

loadCategories();
loadManufacturers();
