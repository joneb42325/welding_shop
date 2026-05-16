import { getFavorites } from './favorites.js';
import { createProductCard } from './script.js';

const favoritesContainer = document.getElementById('favorites-container');
const emptyMessage = document.getElementById('empty-favorites');

async function loadFavoritesPage() {
  const favoritesIds = getFavorites();

  if (favoritesIds.length === 0) {
    favoritesContainer.style.display = 'none';
    emptyMessage.style.display = 'flex';
    return;
  }

  try {
    const queryString = favoritesIds.join(',');
    const res = await fetch(`/products?ids=${queryString}`);

    if (!res.ok) throw new Error('Помилка сервера');
    const favoriteProducts = await res.json();
    if (favoriteProducts.length === 0) {
      emptyMessage.style.display = 'flex';
      return;
    }
    favoritesContainer.innerHTML = '';
    favoriteProducts.forEach((product) => {
      const card = createProductCard(product);
      favoritesContainer.appendChild(card);
    });
  } catch (err) {
    console.error('Помилка завантаження обраного:', err);
    favoritesContainer.innerHTML = '<p>Не вдалося завантажити товари.</p>';
  }
}

loadFavoritesPage();
