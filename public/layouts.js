// Функція для вставки шапки
export function injectHeader() {
  const header = document.querySelector('header.header');
  if (!header) return;

  header.innerHTML = `
      <button class="burger">☰</button>
      <div class="header-left">
        <a href="index.html" class="logo-link">
          <div class="logo">
            <img src="images/logo.webp" alt="Wolfram" />
          </div>
          <p>Wolfram</p>
        </a>
      </div>
      <nav class="nav">
        <a href="index.html">Головна</a>
        <a href="about.html">Про нас</a>
        <a href="delivery.html">Доставка і оплата</a>
      </nav>
<div class="header-right">
<div class="search-container">
    <input type="text" id="search-input" placeholder="Пошук матеріалів..." autocomplete="off">
    <div id="search-results" class="search-results-dropdown"></div>
  </div>
  <a href="favorites.html" class="fav-header-link">❤️ <span class="fav-count">0</span></a>
  <a href="cart.html" class="cart">🛒 <span class="cart-count">0</span></a>
</div>

    `;
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div class="mobile-overlay"></div>
    <div class="mobile-menu">
    <div class="mobile-menu-brand">
        <p>WOLFRAM</p>
    </div>
      <a href="index.html">🏠 Головна</a>
      <a href="about.html">ℹ️ Про нас</a>
      <a href="delivery.html">🚚 Доставка і оплата</a>
      <hr>
      <a href="favorites.html" class="fav-mobile">❤️ Обране <span class="fav-count">0</span></a>
      <a href="cart.html" class="cart-mobile">🛒 Корзина <span class="cart-count">0</span></a>
       <div class="mobile-contacts">
    <h4>Контакти</h4>
    <a href="tel:+380634383823">📞 +38 (063) 438-38-23</a>
    <a href="mailto:dgeeek1990@gmail.com">📧 dgeeek1990@gmail.com</a>
    <div>📍 м. Харків</div>
    </div>
    </div>
  `
  );

  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-overlay');

  burger.addEventListener('click', () => {
    menu.classList.add('active');
    overlay.classList.add('active');
  });
  overlay.addEventListener('click', () => {
    menu.classList.remove('active');
    overlay.classList.remove('active');
  });

  initSearch();
}

// Функція для вставки футера
export function injectFooter() {
  const footer = document.querySelector('footer.footer');
  if (!footer) return;

  footer.innerHTML = `
      <div class="footer-container">
        <div class="footer-column">
          <h4>Про нас</h4>
          <p>Wolfram — магазин високоякісних матеріалів для зварювання.</p>
        </div>
        <div class="footer-column">
          <h4>Контакти</h4>
          <p>Телефон: +380 63 438 3823 Євген</p>
          <p>Email: dgeeek1990@gmail.com</p>
          <p>Адреса: Харків, Україна</p>
        </div>
        <div class="footer-column">
          <h4>Швидкі посилання</h4>
          <a href="index.html">Головна</a>
          <a href="about.html">Про нас</a>
          <a href="delivery.html">Доставка і оплата</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Wolfram. Всі права захищені.</p>
      </div>
    `;

  document.body.insertAdjacentHTML(
    'beforeend',
    `
  <div class="contact-widget">
    <div class="contact-menu">
      <!-- Telegram -->
      <a href="https://t.me/+380634383823" target="_blank" class="contact-item telegram">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
      </a>
      <!-- Viber -->
      <a href="viber://chat?number=%2B380634383823" class="contact-item viber">
        <img src="images/logos/viber-tile.svg" alt="Viber" width="28" height="28">
      </a>
      <!-- Звичайний дзвінок -->
      <a href="tel:+380634383823" class="contact-item phone">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
      </a>
    </div>
    
    <!-- Головна кнопка (Іконка чату) -->
    <!--
    <button class="contact-main-btn" id="contact-toggle">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>
    </button>
    -->
<button class="contact-main-btn" id="contact-toggle">
  <div class="main-btn-content">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
    </svg>
    <span>КНОПКА<br>ЗВ'ЯЗКУ</span>
  </div>
</button>
  </div>
  `
  );

  // Додаємо логіку відкриття/закриття меню
  const contactToggle = document.getElementById('contact-toggle');
  const contactWidget = document.querySelector('.contact-widget');

  if (contactToggle) {
    contactToggle.addEventListener('click', () => {
      contactWidget.classList.toggle('active');
    });

    // Закривати меню при кліку в будь-якому іншому місці
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.contact-widget')) {
        contactWidget.classList.remove('active');
      }
    });
  }
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!searchInput || !resultsContainer) return;

  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();

    if (query.length < 2) {
      resultsContainer.style.display = 'none';
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const matches = await response.json();
      console.log('Дані з сервера:', matches);
      renderSearchResult(matches, resultsContainer);
    } catch (err) {
      console.error('Помилка при пошуку:', err);
    }
  });

  // Закриття при кліку поза пошуком
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      resultsContainer.style.display = 'none';
    }
  });
}

function renderSearchResult(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="search-item">Нічого не знайдено</div>';
  } else {
    container.innerHTML = items
      .map((item) => {
        const imgSrc = item.image.startsWith('http') ? item.image : `images/${item.image}`;
        return `
          <a href="product.html?productId=${item.id}" class="search-item">
            <img src="${imgSrc}" alt="${item.name}">
            <div class="search-info">
              <span class="search-name">${item.name}</span>
            </div>
          </a>
        `;
      })
      .join('');
  }
  container.style.display = 'block';
}
