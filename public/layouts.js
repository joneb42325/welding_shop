// Функція для вставки шапки
export function injectHeader() {
  const header = document.querySelector('header.header');
  if (!header) return;

  header.innerHTML = `
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
<!--
<div class="header-right">
<input class="search" placeholder="Пошук товарів..." type="text" />
</div>
-->
    `;
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
