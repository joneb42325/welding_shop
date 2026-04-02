const form = document.getElementById('category-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch('/admin/categories', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      window.location.href = '/admin/categories.html';
    }
  } catch (err) {
    console.error(err);
  }
});

const imageInput = document.getElementById('image');
const preview = document.getElementById('preview');

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
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
