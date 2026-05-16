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

loadCategories();
loadManufacturers();
