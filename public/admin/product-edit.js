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

    document.getElementById('name').value = product.name;
    document.getElementById('description').value = product.description || '';
    document.getElementById('category-select').value = product.category_id;
    document.getElementById('is_special').checked = product.is_special === 1;

    currentName.textContent = product.name;
    currentDescription.textContent = product.description || '';
    currentCategory.textContent = categorySelect.selectedOptions[0].text;

    if (product.image) {
      currentImage.src = `/images/${product.image}`;
      currentImage.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
    alert('Помилка завантаження товару');
  }
}

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
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

(async function initPage() {
  await checkAuth();
  await loadCategories();
  await loadProduct();
})();
