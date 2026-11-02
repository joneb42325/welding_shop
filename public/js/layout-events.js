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

// Ініціалізація Meta Pixel (Facebook)
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
        // Пряме ЧПУ посилання для SEO
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
