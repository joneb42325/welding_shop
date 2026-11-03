(function (c, l, a, r, i, t, y) {
  c[a] =
    c[a] ||
    function () {
      (c[a].q = c[a].q || []).push(arguments);
    };
  t = l.createElement(r);
  t.async = 1;
  t.src = 'https://www.clarity.ms/tag/' + i;
  y = l.getElementsByTagName(r)[0];
  y.parentNode.insertBefore(t, y);
})(window, document, 'clarity', 'script', 'z24smkdt0e');

// Функция ленивой загрузки тяжелой аналитики (GTM + Meta Pixel)
function loadDeferredAnalytics() {
  if (window.analyticsLoaded) return;
  window.analyticsLoaded = true;

  // 1. Ініціалізація dataLayer та gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag; // робимо глобальною для виклику конверсій

  // ⚡ Глобальна функція для трекінгу конверсій Google Ads (без затримок)
  window.gtag_report_conversion = function (url) {
    const callback = function () {
      if (typeof url !== 'undefined') {
        window.location = url;
      }
    };
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: 'AW-18487453527/3u9cCIiP4pwdENfOwO9E',
        value: 1.0,
        currency: 'UAH',
        event_callback: callback,
      });
    } else {
      callback();
    }
    return false;
  };

  gtag('js', new Date());
  gtag('config', 'G-X4VLDJJ2XJ'); // Google Analytics 4
  gtag('config', 'AW-18487453527'); // Google Ads

  // 2. Завантаження скрипта Google Analytics / Tag Manager
  const gtmScript = document.createElement('script');
  gtmScript.async = true;
  gtmScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-X4VLDJJ2XJ';
  document.head.appendChild(gtmScript);

  // 3. Meta Pixel (Facebook)
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', '2680005392433448');
  fbq('track', 'PageView');
}

// Запускаем только после взаимодействия пользователя или через 3.5 сек
window.addEventListener('DOMContentLoaded', () => {
  const triggerAnalytics = () => {
    loadDeferredAnalytics();
    window.removeEventListener('scroll', triggerAnalytics);
    window.removeEventListener('touchstart', triggerAnalytics);
    window.removeEventListener('mousemove', triggerAnalytics);
  };

  window.addEventListener('scroll', triggerAnalytics, { passive: true });
  window.addEventListener('touchstart', triggerAnalytics, { passive: true });
  window.addEventListener('mousemove', triggerAnalytics, { passive: true });

  // Запасной таймер
  setTimeout(loadDeferredAnalytics, 3500);
});

function initLayoutEvents() {
  // 1. Мобільне меню
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-overlay');

  if (burger && menu && overlay) {
    burger.addEventListener('click', () => {
      menu.classList.add('active');
      overlay.classList.add('active');
      document.body.classList.add('no-scroll');
    });

    overlay.addEventListener('click', () => {
      menu.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('no-scroll');
    });
  }

  // 2. Віджет зв'язку у футері
  const contactToggle = document.getElementById('contact-toggle');
  const contactWidget = document.querySelector('.contact-widget');

  if (contactToggle && contactWidget) {
    contactToggle.addEventListener('click', () => {
      contactWidget.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.contact-widget')) {
        contactWidget.classList.remove('active');
      }
    });
  }

  // 3. Пошук
  initSearch();
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!searchInput || !resultsContainer) return;

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
      }
    }
  });

  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();

    if (query.length < 2) {
      resultsContainer.style.display = 'none';
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const matches = await response.json();
      renderSearchResult(matches, resultsContainer, query);
    } catch (err) {
      console.error('Помилка при пошуку:', err);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      resultsContainer.style.display = 'none';
    }
  });
}

function renderSearchResult(items, container, query) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="search-item">Нічого не знайдено</div>';
  } else {
    const maxItemsToShow = 12;
    const itemsHtml = items
      .slice(0, maxItemsToShow)
      .map((item) => {
        const imgSrc = item.image.startsWith('http') ? item.image : `/images/${item.image}`;
        const productSlug = item.slug || item.id;
        return `
          <a href="/product/${productSlug}-${item.id}" class="search-item">
            <img src="${imgSrc}" alt="${item.name}">
            <div class="search-info">
              <span class="search-name">${item.name}</span>
            </div>
          </a>
        `;
      })
      .join('');

    const viewAllHtml = `
    <div class="search-view-all">
      <a href="/search.html?q=${encodeURIComponent(query)}">
        Переглянути всі результати (${items.length}) ➔
      </a>
    </div>
    `;
    container.innerHTML = viewAllHtml + itemsHtml;
  }
  container.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initLayoutEvents);
