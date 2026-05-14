const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
  alert('ID товару не знайдено');
  window.location.href = 'products.html';
}

const form = document.getElementById('edit-product-form');
const categorySelect = document.getElementById('category-select');
const preview = document.getElementById('preview');
const imageInput = document.getElementById('image-input');

const currentName = document.getElementById('current-name');
const currentCategory = document.getElementById('current-category');
const currentDescription = document.getElementById('current-description');
const currentImage = document.getElementById('current-image');

const manufacturerSelect = document.getElementById('manufacturer-select');

// Добавляем загрузку производителей
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

async function checkAuth() {
  try {
    const res = await fetch('/admin/check');
    if (res.status === 401) window.location.href = '/admin/login.html';
  } catch (err) {
    console.error(err);
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/admin/categories');
    const categories = await res.json();

    categorySelect.innerHTML = '<option value="">Оберіть категорію</option>';
    categories.forEach((cat) => {
      categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження категорій');
  }
}

async function loadProduct() {
  try {
    const res = await fetch(`/admin/products/${productId}`);
    if (!res.ok) throw new Error('Товар не знайдено');
    const product = await res.json();

    // Заполняем основные поля
    document.getElementById('name').value = product.name;
    document.getElementById('description').value = product.description || '';
    document.getElementById('category-select').value = product.category_id;
    document.getElementById('manufacturer-select').value = product.manufacturer_id;
    document.getElementById('is_special').checked = product.is_special === 1;

    // Заполняем поля опций/цен
    document.getElementById('diameter').value = product.diameter || '';
    document.getElementById('weight').value = product.weight || '';
    document.getElementById('price_retail').value = product.price_retail || 0;
    document.getElementById('price_company').value = product.price_company || 0;
    document.getElementById('price_wholesale').value = product.price_wholesale || 0;
    document.getElementById('wholesale_threshold').value = product.wholesale_threshold || 0;
    document.getElementById('stock').value = product.stock || 0;

    // Показываем текущее фото
    if (product.image) {
      currentImage.src = product.image;
      currentImage.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження даних товару');
  }
}

imageInput.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch(`/admin/products/${productId}`, {
      method: 'PUT',
      body: formData,
    });

    const result = await res.json();

    if (res.ok && result.success) {
      alert('Дані успішно оновлено!');
      window.location.href = 'products.html';
    } else {
      alert('Помилка при збереженні: ' + (result.error || 'невідома помилка'));
    }
  } catch (err) {
    console.error(err);
    alert("Помилка зв'язку з сервером");
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

(async function initPage() {
  await checkAuth();
  await loadCategories();
  await loadManufacturers();
  await loadProduct();
})();
