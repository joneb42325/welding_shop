// Функція для вставки шапки
export function injectHeader() {
  const header = document.querySelector('header.header');
  if (!header) return;

  header.innerHTML = `
      <button class="burger">☰</button>
      <div class="header-left">
        <a href="index.html" class="logo-link">
          <div class="logo">
            <img src="images/logo.png" alt="Wolfram" />
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
  <a href="cart.html" class="cart">🛒 <span class="cart-count">0</span></a>
</div>

    `;
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div class="mobile-overlay"></div>
    <div class="mobile-menu">
      <a href="index.html">🏠 Головна</a>
      <a href="about.html">ℹ️ Про нас</a>
      <a href="delivery.html">🚚 Доставка і оплата</a>
      <hr>
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
}
