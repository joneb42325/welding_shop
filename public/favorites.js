const FAVORITES_KEY = 'wolfram_favorites';

export function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
}

export function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function getFavoritesCount() {
  return getFavorites().length;
}

export function updateFavoritesUI() {
  const count = getFavoritesCount();

  document.querySelectorAll('.fav-count').forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? 'block' : 'none';
  });
}

export function toggleFavorite(id) {
  const productId = String(id);
  const favorites = getFavorites();
  const index = favorites.indexOf(productId);

  if (index === -1) {
    favorites.push(productId);
  } else {
    favorites.splice(index, 1);
  }

  saveFavorites(favorites);
  updateFavoritesUI();
  return index === -1;
}

export function isFavorite(id) {
  const productId = String(id);
  const favorites = getFavorites();
  return favorites.includes(productId);
}
