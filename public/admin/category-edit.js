const form = document.getElementById('category-form');
const preview = document.getElementById('preview');
const imageInput = document.getElementById('image');

const params = new URLSearchParams(window.location.search);
const id = params.get('catId');

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

async function loadCategory() {
  const res = await fetch(`/admin/categories/${id}`);
  const category = await res.json();
  document.getElementById('current-name-display').textContent = category.name;

  const currentImgDisplay = document.getElementById('current-image-display');

  currentImgDisplay.src = `/images/${category.image}`;
  currentImgDisplay.classList.remove('hidden');
}

imageInput.addEventListener('change', () => {
  const file = this.files[0];

  if (file) {
    preview.src = URL.createObjectURL(file);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch(`/admin/categories/${id}`, {
      method: 'PUT',
      body: formData,
    });

    if (res.ok) {
      window.location.href = 'categories.html';
    } else {
      const errorData = await res.json();
      alert('Помилка збереження: ' + (errorData.error || 'Невідома помилка'));
    }
  } catch (err) {
    console.error('Помилка при відправці даних:', err);
    alert("Помилка з'єднання з сервером.");
  }
});

loadCategory();
