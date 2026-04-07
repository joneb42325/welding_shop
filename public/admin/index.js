document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    const response = await fetch('/admin/logout', { method: 'POST' });
    if (response.ok) {
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Помилка при виході:', error);
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
