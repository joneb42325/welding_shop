require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { createSlug } = require('./utils/slugify');
const db = require('./db');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { sendOrderEmail } = require('./services/email');
const cloudinary = require('./cloudinaryConfig');

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 мін
  max: 5,
  message: { error: 'Забагато спроб входу. Спробуйте через 15 хвилин.' },
});

const app = express();

app.get('/product.html', (req, res, next) => {
  const productId = req.query.productId;

  if (!productId || !/^\d+$/.test(productId)) {
    return next();
  }

  getProductById(productId, (err, results) => {
    if (err) {
      console.error('Помилка завантаження товару:', err);
      return res.status(500).send('Помилка сервера');
    }

    if (!results || results.length === 0) {
      return res.status(404).send('Товар не знайдено');
    }

    const product = results[0];
    const slug = createSlug(product.name);

    return res.redirect(301, `/product/${slug}-${product.id}`);
  });
});

app.get('/category.html', (req, res, next) => {
  const categoryId = req.query.categoryId;
  if (!categoryId || !/^\d+$/.test(categoryId)) return next();

  db.query('SELECT name, id FROM categories WHERE id = ?', [categoryId], (err, results) => {
    if (err || results.length === 0) return res.redirect(301, '/');

    const slug = createSlug(results[0].name);
    return res.redirect(301, `/category/${slug}-${results[0].id}`);
  });
});

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');

app.use((req, res, next) => {
  // 1. Хелпер оптимізації зображень (доступний у всіх EJS шаблонах)
  res.locals.getOptimizedImg = (url, width = 500) => {
    if (!url) return '/images/logo.webp';

    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
    }

    if (!url.startsWith('http') && !url.startsWith('/')) {
      return '/images/' + url;
    }

    return url;
  };

  // 2. Категорії для сайдбара та навігації
  const catQuery = `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
           LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id
    HAVING product_count > 0
    ORDER BY c.id ASC
  `;

  db.query(catQuery, (err, categories) => {
    if (!err && categories) {
      res.locals.categories = categories.map((cat) => ({
        ...cat,
        slug: createSlug(cat.name),
      }));
    } else {
      res.locals.categories = [];
    }
    next();
  });
});

app.get('/delivery.html', (req, res) => {
  res.render('pages/delivery');
});

// ГОЛОВНА СТОРІНКА (SSR)
app.get('/', (req, res) => {
  // Запит 1: Спеціальні пропозиції
  const specialQuery = `
    SELECT p.*, p.stock AS total_stock, m.name AS manufacturer_name
    FROM products p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.is_special = 1
    ORDER BY p.sort_order ASC, p.id DESC
    LIMIT 12
  `;

  // Запит 2: Активні категорії для сітки на головній
  const catQuery = `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id
    HAVING product_count > 0
    ORDER BY c.id ASC
  `;

  db.query(specialQuery, (err, specialProducts) => {
    if (err) {
      console.error('Помилка завантаження спец. пропозицій:', err);
      return res.status(500).send('Помилка сервера');
    }

    db.query(catQuery, (catErr, categories) => {
      if (catErr) {
        console.error('Помилка завантаження категорій:', catErr);
        return res.status(500).send('Помилка сервера');
      }

      res.render('index', {
        specialProducts,
        categories,
        createSlug,
      });
    });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wolfram_products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    /*
    format: 'webp',
    transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
    */
    public_id: (req, file) => Date.now() + '-' + file.originalname.split('.')[0],
  },
});

function calculateDynamicPrice(item, quantity) {
  const qty = Math.max(1, parseFloat(quantity) || 1);

  const threshold = Math.max(1, parseInt(item.wholesale_threshold, 10) || 50);

  // Базовые цены
  const retail = parseFloat(item.price_retail) || parseFloat(item.price) || 0;

  const wholesale = parseFloat(item.price_wholesale) || 0;

  const cutFee =
    item.cut_fee !== undefined && item.cut_fee !== null
      ? Math.max(0, parseFloat(item.cut_fee) || 0)
      : 40;

  // Скидки по количеству
  const d1 = item.markup_tier1 !== undefined ? parseFloat(item.markup_tier1) : 0.0;

  const d2 = item.markup_tier2 !== undefined ? parseFloat(item.markup_tier2) : 0.15;

  const d3 = item.markup_tier3 !== undefined ? parseFloat(item.markup_tier3) : 0.35;

  let pricePerUnit = retail;
  let discount = 0;
  let appliedCutFee = cutFee;

  if (qty >= threshold) {
    pricePerUnit = wholesale > 0 ? wholesale : retail;
    appliedCutFee = 0;
  } else if (qty >= 10) {
    discount = d3;
  } else if (qty >= 5) {
    discount = d2;
  } else {
    discount = d1;
  }

  if (qty < threshold) {
    pricePerUnit = Number((retail * (1 - discount)).toFixed(2));
  }

  const totalPrice = Math.round(qty * pricePerUnit + appliedCutFee);

  return {
    pricePerKg: pricePerUnit,
    totalPrice,
    cutFee: appliedCutFee,
    discountPercent: retail > 0 ? Math.round((1 - pricePerUnit / retail) * 100) : 0,
  };
}

const upload = multer({ storage: storage });

app.get('/products/special', (req, res) => {
  const query = `
    SELECT
      p.*,
      p.stock AS total_stock,
      m.name AS manufacturer_name
    FROM products p
           LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE is_special = 1
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/category/:slugAndId', (req, res) => {
  const param = req.params.slugAndId;
  const match = param.match(/(?:^|-)(\d+)$/);

  if (!match) return res.status(404).send('Категорію не знайдено');

  const categoryId = match[1];

  // Отримуємо інформацію про категорію
  db.query('SELECT * FROM categories WHERE id = ?', [categoryId], (err, catResults) => {
    if (err || catResults.length === 0) {
      return res.status(404).send('Категорію не знайдено');
    }

    const category = catResults[0];
    const correctSlug = createSlug(category.name);
    const correctUrl = `/category/${correctSlug}-${category.id}`;

    // Якщо URL не ідеальний (наприклад, без slug) — 301 редирект
    if (param !== `${correctSlug}-${category.id}`) {
      return res.redirect(301, correctUrl);
    }

    // Отримуємо товари для цієї категорії
    const prodQuery = `
      SELECT p.*, p.stock AS total_stock, m.name AS manufacturer_name
      FROM products p
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.category_id = ?
      ORDER BY p.sort_order ASC, p.id DESC
    `;

    db.query(prodQuery, [categoryId], (pErr, products) => {
      if (pErr) return res.status(500).send('Помилка сервера');

      res.render('category', {
        category,
        products,
        createSlug,
      });
    });
  });
});

app.get('/categories/:id/info', (req, res) => {
  const query = 'SELECT name, image FROM categories WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results[0]);
  });
});

app.get('/categories', (req, res) => {
  const query = `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
           LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    // Додаємо slug до кожної категорії для побудови меню на фронтенді
    const formatted = results.map((cat) => ({
      ...cat,
      slug: createSlug(cat.name),
    }));

    res.json(formatted);
  });
});

app.get('/product-options/:id', (req, res) => {
  const productId = req.params.id;

  const query = `
  SELECT 
  o.diameter,
  o.weight,
  o.stock,
  o.price_retail,
  o.price_company,
  o.price_wholesale
  FROM product_options o
  WHERE o.product_id = ?
  `;

  db.query(query, [productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/products', (req, res) => {
  const ids = req.query.ids;
  let sql = `
    SELECT *, stock as total_stock FROM products 
    `;

  const params = [];

  if (ids) {
    const idArray = ids.split(',').map((id) => id.trim());
    if (idArray.length > 0) {
      sql += ' WHERE id IN (?)';
      params.push(idArray);
    }
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    res.json(results);
  });
});

app.get('/api/search', (req, res) => {
  const searchTerm = req.query.q;
  if (!searchTerm) return res.json([]);

  const words = searchTerm.split(' ').filter((word) => word.length > 0);

  let conditions = [];
  let params = [];

  words.forEach((word) => {
    const p = `%${word}%`;
    // Шукаємо слово в назві, описі, діаметрі АБО назві виробника
    conditions.push(
      `(p.name LIKE ? OR p.description LIKE ? OR p.diameter LIKE ? OR m.name LIKE ?)`
    );
    params.push(p, p, p, p);
  });

  const query = `
    SELECT p.*, m.name as manufacturer_name, p.stock as total_stock
    FROM products p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE ${conditions.length > 0 ? conditions.join(' AND ') : '1'} 
    LIMIT 100`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

function getProductById(productId, callback) {
  const sql = `
    SELECT
      p.*,
      m.name AS manufacturer_name,
      c.name AS category_name,
      p.stock AS total_stock
    FROM products p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;

  db.query(sql, [productId], callback);
}

// HTML-страница товара для браузера и поисковых систем

app.get('/product/:slugAndId', (req, res) => {
  const param = req.params.slugAndId;

  // Поддерживаем и старый /product/36,
  // и новый /product/nazvanie-tovara-36.
  const match = param.match(/(?:^|-)(\d+)$/);

  if (!match) {
    return res.status(404).send('Товар не знайдено');
  }

  const productId = match[1];

  getProductById(productId, (err, results) => {
    if (err) {
      console.error('Помилка завантаження товару:', err);
      return res.status(500).send('Помилка сервера');
    }

    if (!results || results.length === 0) {
      return res.status(404).send('Товар не знайдено');
    }

    const product = results[0];
    const correctSlug = createSlug(product.name);
    const correctUrl = `/product/${correctSlug}-${product.id}`;

    // Направляем старые адреса и неправильные slug
    // на один канонический URL.
    if (param !== `${correctSlug}-${product.id}`) {
      return res.redirect(301, correctUrl);
    }

    const relatedSql = `
  SELECT
    p.*,
    m.name AS manufacturer_name,
    c.name AS category_name
  FROM products p
  LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.category_id = ?
    AND p.id != ?
  ORDER BY p.id DESC
  LIMIT 16
`;

    db.query(relatedSql, [product.category_id, product.id], (relatedErr, relatedResults) => {
      if (relatedErr) {
        console.error('Помилка завантаження схожих товарів:', relatedErr);

        // Основная страница всё равно должна открыться
        return res.render('product', {
          product,
          relatedProducts: [],
          createSlug,
        });
      }

      res.render('product', {
        product,
        relatedProducts: relatedResults,
        createSlug,
      });
    });
  });
});

// API для JavaScript: возвращает JSON
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  getProductById(productId, (err, results) => {
    if (err) {
      console.error('Помилка завантаження товару:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    res.json(results[0]);
  });
});

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

if (!process.env.SESSION_SECRET) {
  console.error('❌ КРИТИЧНА ПОМИЛКА: SESSION_SECRET не вказано у .env файлі!');
  process.exit(1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 день
    },
  })
);

app.post('/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    return req.session.regenerate((err) => {
      if (err) {
        console.error('Помилка регенерації сесії:', err);
        return res.status(500).json({ error: 'Помилка сервера при авторизації' });
      }
      req.session.isAdmin = true;
      return res.json({ success: true });
    });
  }

  res.status(401).json({ error: 'Невірний логін або пароль' });
});

function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/admin', (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.sendFile(__dirname + '/public/admin/index.html');
  } else {
    res.redirect('/admin/login.html');
  }
});

app.get('/admin/check', (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.json({ authorized: true });
  } else {
    res.status(401).json({ authorized: false });
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

//categories

//GET
app.get('/admin/categories', adminAuth, (req, res) => {
  const query = 'SELECT * FROM categories';

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error:' });
    res.json(results);
  });
});

//GET BY ID
app.get('/admin/categories/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const query = 'SELECT *  FROM categories WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error:' });

    if (results.length === 0) {
      return res.status(404).json({ error: 'Категорію не знайдено' });
    }
    res.json(results[0]);
  });
});

//POST
app.post('/admin/categories', adminAuth, upload.single('image'), (req, res) => {
  const name = req.body.name;
  const image = req.file.path;

  const query = 'INSERT INTO categories (name, image) VALUES (?, ?)';

  db.query(query, [name, image], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }

    res.json({ success: true });
  });
});

// PUT (Оновлення категорії)
app.put('/admin/categories/:id', adminAuth, upload.single('image'), (req, res) => {
  const { name } = req.body;
  const id = req.params.id;
  const getOldImgQuery = 'SELECT image FROM categories WHERE id = ?';

  db.query(getOldImgQuery, [id], async (err, results) => {
    if (err) {
      console.error('Помилка пошуку категорії:', err);
      return res.status(500).json({ error: 'Помилка бази даних' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Категорію не знайдено' });
    }

    const oldImageName = results[0].image;

    if (req.file) {
      const newImage = req.file.path;
      const query = 'UPDATE categories SET name = ?, image = ? WHERE id = ?';

      // Видаляємо старий файл з диска, якщо він був
      if (oldImageName) {
        try {
          const parts = oldImageName.split('/');
          const fileName = parts.pop();
          const folder = parts.pop();
          const publicId = `${folder}/${fileName.split('.')[0]}`;

          await cloudinary.uploader.destroy(publicId);
          console.log('Видалено з Cloudinary:', publicId);
        } catch (err) {
          console.error('Помилка видалення з Cloudinary:', err);
        }
      }

      db.query(query, [name, newImage, id], (err) => {
        if (err) {
          console.error('Помилка оновлення категорії з фото:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        res.json({ success: true });
      });
    } else {
      const query = 'UPDATE categories SET name = ? WHERE id = ?';

      db.query(query, [name, id], (err) => {
        if (err) {
          console.error('Помилка оновлення категорії без фото:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        res.json({ success: true });
      });
    }
  });
});

//DELETE

app.delete('/admin/categories/:id', adminAuth, (req, res) => {
  const id = req.params.id;

  const findPhotosQuery = `
    SELECT image FROM products WHERE category_id = ?
    UNION
    SELECT image FROM categories WHERE id = ?
  `;

  db.query(findPhotosQuery, [id, id], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    for (const row of results) {
      if (!row.image) continue;

      try {
        const parts = row.image.split('/');
        const fileName = parts.pop();
        const folder = parts.pop();
        const publicId = `${folder}/${fileName.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);
        console.log('Видалено з Cloudinary:', publicId);
      } catch (err) {
        console.error('Помилка видалення з Cloudinary:', err);
      }
    }
    const deleteQuery = 'DELETE FROM categories WHERE id = ?';
    db.query(deleteQuery, [id], (err, results) => {
      if (err) {
        console.error('Помилка видалення з БД:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      res.json({ success: true });
    });
  });
});

app.get('/admin/products/search', adminAuth, (req, res) => {
  const search = String(req.query.q || '').trim();

  if (search.length < 2) {
    return res.json([]);
  }

  const term = `%${search}%`;

  const sql = `
    SELECT
      p.id,
      p.name,
      p.diameter,
      p.weight,
      p.unit,
      p.price_retail,
      m.name AS manufacturer_name
    FROM products p
    LEFT JOIN manufacturers m
      ON p.manufacturer_id = m.id
    WHERE
      p.name LIKE ?
      OR p.diameter LIKE ?
      OR p.weight LIKE ?
      OR m.name LIKE ?
    ORDER BY p.sort_order ASC, p.name ASC
    LIMIT 10
  `;

  db.query(sql, [term, term, term, term], (err, products) => {
    if (err) {
      console.error('Помилка пошуку товарів:', err);

      return res.status(500).json({
        error: 'Помилка пошуку товарів',
      });
    }

    res.json(products);
  });
});

//GET
app.get('/admin/products', adminAuth, (req, res) => {
  const categoryId = req.query.category_id;

  let query = `
    SELECT
      p.*,
      c.name AS category_name,
      m.name AS manufacturer_name
    FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
  `;

  let params = [];
  if (categoryId) {
    query += ` WHERE p.category_id = ?`;
    params.push(categoryId);
  }

  /*query += ` ORDER BY p.id DESC`; */
  query += ` ORDER BY p.sort_order ASC, p.id DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB Error' });
    }
    res.json(results);
  });
});

//GET BY ID
app.get('/admin/products/:id', adminAuth, (req, res) => {
  const query = `SELECT * FROM products WHERE id = ? LIMIT 1`;

  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB Error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }
    res.json(results[0]);
  });
});

app.post('/admin/products', adminAuth, upload.single('image'), (req, res) => {
  const {
    name,
    category_id,
    description,
    is_special,
    is_wholesale,
    has_dynamic_pricing,
    manufacturer_id,
    diameter,
    weight,
    price_retail,
    price_company,
    price_wholesale,
    unit,
    wholesale_threshold,
    stock,
    markup_tier1,
    markup_tier2,
    markup_tier3,
    cut_fee,
    existing_image,
  } = req.body;

  const image = req.file ? req.file.path : existing_image || null;
  const isSpecial = is_special ? 1 : 0;
  const isWholesale =
    is_wholesale === '1' || is_wholesale === 'true' || is_wholesale === true ? 1 : 0;
  const hasDynamic = has_dynamic_pricing ? 1 : 0;
  const productUnit = unit || 'шт';

  const sql = `
      INSERT INTO products
      (name, category_id, description, image, is_special, is_wholesale, has_dynamic_pricing, manufacturer_id, diameter, weight, price_retail, price_company, price_wholesale, unit, wholesale_threshold, stock, markup_tier1, markup_tier2, markup_tier3, cut_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      category_id,
      description,
      image,
      isSpecial,
      isWholesale,
      hasDynamic,
      manufacturer_id,
      diameter,
      weight,
      price_retail || 0,
      price_company || 0,
      price_wholesale || 0,
      productUnit,
      wholesale_threshold || 50,
      stock || 0,
      markup_tier1 !== undefined ? parseFloat(markup_tier1) : 0.0,
      markup_tier2 !== undefined ? parseFloat(markup_tier2) : 0.15,
      markup_tier3 !== undefined ? parseFloat(markup_tier3) : 0.35,
      cut_fee !== undefined ? parseInt(cut_fee) : 40,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: 'Помилка БД' });
      res.status(201).json({ success: true });
    }
  );
});

app.put('/admin/products/reorder', adminAuth, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Некоректний формат даних' });
  }

  try {
    const promises = items.map((item) => {
      return new Promise((resolve, reject) => {
        db.query(
          'UPDATE products SET sort_order = ? WHERE id = ?',
          [item.sort_order, item.id],
          (err) => (err ? reject(err) : resolve())
        );
      });
    });

    await Promise.all(promises);
    res.json({ message: 'Порядок товарів успішно збережено' });
  } catch (err) {
    console.error('Помилка оновлення порядку:', err);
    res.status(500).json({ error: 'Помилка бази даних' });
  }
});

app.put('/admin/products/update-prices', adminAuth, (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Некоректний формат даних' });
  }

  // Створюємо масив промісів для кожного товару
  const promises = items.map((item) => {
    return new Promise((resolve, reject) => {
      const pRetail = parseFloat(item.price_retail) || 0;
      const pCompany = parseFloat(item.price_company) || 0;
      const pWholesale = parseFloat(item.price_wholesale) || 0;

      db.query(
        `UPDATE products 
         SET price_retail = ?, price_company = ?, price_wholesale = ? 
         WHERE id = ?`,
        [pRetail, pCompany, pWholesale, item.id],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
  });

  Promise.all(promises)
    .then(() => {
      res.json({ success: true, message: 'Ціни успішно оновлено' });
    })
    .catch((err) => {
      console.error('Помилка масового оновлення цін:', err);
      res.status(500).json({ error: 'Помилка бази даних' });
    });
});

app.put('/admin/products/:id', adminAuth, upload.single('image'), (req, res) => {
  const productId = req.params.id;

  // 1. Отримуємо всі поля з тіла запиту
  const {
    name,
    category_id,
    description,
    is_special,
    is_wholesale,
    has_dynamic_pricing,
    manufacturer_id,
    diameter,
    weight,
    price_retail,
    price_company,
    price_wholesale,
    unit,
    wholesale_threshold,
    stock,
    markup_tier1,
    markup_tier2,
    markup_tier3,
    cut_fee,
  } = req.body;

  // Форматування булевих прапорів (аналогічно до POST)
  const isSpecial = is_special === '1' || is_special === 'true' || is_special === true ? 1 : 0;
  const isWholesale =
    is_wholesale === '1' || is_wholesale === 'true' || is_wholesale === true ? 1 : 0;
  const hasDynamic =
    has_dynamic_pricing === '1' || has_dynamic_pricing === 'true' || has_dynamic_pricing === true
      ? 1
      : 0;

  // Форматування типів даних для БД
  const mId = manufacturer_id ? parseInt(manufacturer_id) : null;
  const pRetail = parseFloat(price_retail) || 0;
  const pCompany = parseFloat(price_company) || 0;
  const pWholesale = parseFloat(price_wholesale) || 0;
  const productUnit = unit || 'шт';
  const wThreshold = parseInt(wholesale_threshold) || 50;
  const s = parseInt(stock) || 0;

  // Парсинг полів формули
  const mTier1 = markup_tier1 !== undefined ? parseFloat(markup_tier1) : 0.0;
  const mTier2 = markup_tier2 !== undefined ? parseFloat(markup_tier2) : 0.15;
  const mTier3 = markup_tier3 !== undefined ? parseFloat(markup_tier3) : 0.35;
  const cFee = cut_fee !== undefined ? parseInt(cut_fee) : 40;

  // Пошук старої картинки для видалення з Cloudinary (якщо завантажено нову)
  db.query('SELECT image FROM products WHERE id = ?', [productId], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Помилка бази даних' });
    if (results.length === 0) return res.status(404).json({ error: 'Товар не знайдено' });

    const oldImage = results[0].image;
    let query;
    let params;

    // 2. Формуємо єдиний запит UPDATE з урахуванням is_wholesale
    if (req.file) {
      // Якщо завантажено нове фото
      query = `
        UPDATE products SET
                          name = ?, category_id = ?, description = ?, is_special = ?, is_wholesale = ?, has_dynamic_pricing = ?, manufacturer_id = ?,
                          diameter = ?, weight = ?, price_retail = ?, price_company = ?, price_wholesale = ?, unit = ?, wholesale_threshold = ?, stock = ?,
                          markup_tier1 = ?, markup_tier2 = ?, markup_tier3 = ?, cut_fee = ?, image = ?
        WHERE id = ?
      `;
      params = [
        name,
        category_id,
        description,
        isSpecial,
        isWholesale,
        hasDynamic,
        mId,
        diameter,
        weight,
        pRetail,
        pCompany,
        pWholesale,
        productUnit,
        wThreshold,
        s,
        mTier1,
        mTier2,
        mTier3,
        cFee,
        req.file.path,
        productId,
      ];
    } else {
      // Якщо фото не змінювалось
      query = `
        UPDATE products SET
                          name = ?, category_id = ?, description = ?, is_special = ?, is_wholesale = ?, has_dynamic_pricing = ?, manufacturer_id = ?,
                          diameter = ?, weight = ?, price_retail = ?, price_company = ?, price_wholesale = ?, unit = ?, wholesale_threshold = ?, stock = ?,
                          markup_tier1 = ?, markup_tier2 = ?, markup_tier3 = ?, cut_fee = ?
        WHERE id = ?
      `;
      params = [
        name,
        category_id,
        description,
        isSpecial,
        isWholesale,
        hasDynamic,
        mId,
        diameter,
        weight,
        pRetail,
        pCompany,
        pWholesale,
        productUnit,
        wThreshold,
        s,
        mTier1,
        mTier2,
        mTier3,
        cFee,
        productId,
      ];
    }

    // 3. Виконуємо оновлення в БД
    db.query(query, params, async (updateErr) => {
      if (updateErr) {
        console.error('Помилка оновлення:', updateErr);
        return res.status(500).json({ error: 'Помилка при збереженні даних' });
      }

      // 4. Якщо була нова картинка — видаляємо стару з Cloudinary
      if (req.file && oldImage && oldImage.startsWith('http')) {
        try {
          const parts = oldImage.split('/');
          const fileName = parts.pop();
          const folder = parts.pop();
          const publicId = `${folder}/${fileName.split('.')[0]}`;
          await cloudinary.uploader.destroy(publicId);
          console.log('Видалено з Cloudinary:', publicId);
        } catch (cErr) {
          console.error('Помилка видалення старого фото:', cErr);
        }
      }

      res.json({ success: true });
    });
  });
});

app.delete('/admin/products/:id', adminAuth, (req, res) => {
  const id = req.params.id;

  db.query('SELECT image FROM products WHERE id = ?', [id], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Серверна помилка' });
    if (results.length === 0) return res.status(404).json({ error: 'Товар не знайдено' });

    const imageName = results[0].image;

    // Видаляємо з Cloudinary
    if (imageName && imageName.startsWith('http')) {
      try {
        const parts = imageName.split('/');
        const fileName = parts.pop();
        const folder = parts.pop();
        const publicId = `${folder}/${fileName.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (cErr) {
        console.error('Cloudinary error:', cErr);
      }
    }

    // Видаляємо тільки з однієї таблиці!
    db.query('DELETE FROM products WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ error: 'Помилка видалення' });
      res.json({ success: true });
    });
  });
});

// GET all manufacturers
app.get('/admin/manufacturers', adminAuth, (req, res) => {
  const query = 'SELECT * FROM manufacturers ORDER BY id';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});

// GET manufacturer by ID
app.get('/admin/manufacturers/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const query = 'SELECT * FROM manufacturers WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length === 0) return res.status(404).json({ error: 'Виробника не знайдено' });
    res.json(results[0]);
  });
});

// POST new manufacturer
app.post('/admin/manufacturers', adminAuth, (req, res) => {
  const { name } = req.body;
  const query = 'INSERT INTO manufacturers (name) VALUES (?)';
  db.query(query, [name], (err) => {
    if (err) return res.status(500).json({ error: 'Помилка БД' });
    res.json({ success: true });
  });
});

// PUT update manufacturer
app.put('/admin/manufacturers/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  const query = 'UPDATE manufacturers SET name = ? WHERE id = ?';
  db.query(query, [name, id], (err) => {
    if (err) return res.status(500).json({ error: 'Помилка БД' });
    res.json({ success: true });
  });
});

// DELETE manufacturer
app.delete('/admin/manufacturers/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM manufacturers WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: 'Помилка БД' });
    res.json({ success: true });
  });
});

async function sendTelegramNotification(customer, items, totalPrice, orderId) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || '').split(',');

  let message = `🚨 <b>НОВЕ ЗАМОВЛЕННЯ #${orderId}!</b>\n\n`;
  message += `👤 <b>Клієнт:</b> ${customer.name}\n`;
  message += `📞 <b>Телефон:</b> ${customer.phone}\n`;
  if (customer.email) message += `📧 <b>Email:</b> ${customer.email}\n`;
  message += `📍 <b>Доставка:</b> ${customer.delivery}\n`;
  if (customer.comment) message += `💬 <b>Коментар:</b> ${customer.comment}\n\n`;

  message += `🛒 <b>ТОВАРИ:</b>\n`;
  items.forEach((item, index) => {
    message += `${index + 1}. ${item.name} `;
    if (item.diameter) message += `(Ø ${item.diameter}) `;
    if (item.weight && !item.has_dynamic_pricing) message += `[${item.weight} кг] `;

    if (item.manufacturer) {
      const brandName = item.manufacturer;
      message += `\n  <b>Виробник:</b> ${brandName}`;
    }
    if (item.has_dynamic_pricing) {
      const calc = calculateDynamicPrice(item, item.quantity);
      message += `\n К-ть: ${item.quantity} кг (${calc.pricePerKg} грн/кг + порізка ${calc.cutFee} грн) | Сума: ${calc.totalPrice} грн\n`;
    } else {
      const unitPrice = parseFloat(item.price).toFixed(2);
      const sum = (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2);
      message += `\n  Ціна: ${unitPrice} грн/шт.| К-ть: ${item.quantity} шт. | Сума: ${sum} грн\n`;
    }
  });

  message += `\n💰 <b>Всього до сплати: ${totalPrice} грн</b>`;

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  for (const chatId of CHAT_IDS) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      console.log(`Повідомлення для замовлення #${orderId} відправлено в ТГ (${chatId})!`);
    } catch (err) {
      console.error(`Помилка відправки в ТГ для ${chatId}:`, err);
    }
  }
}

// POST - Створення нового замовлення
app.post('/api/orders', (req, res) => {
  const { customer, items, totalPrice } = req.body;

  let calculatedTotalPrice = 0;

  const validatedItems = items.map((item) => {
    let finalItemPrice = parseFloat(item.price) || 0;

    if (item.has_dynamic_pricing) {
      const calc = calculateDynamicPrice(item, item.quantity, item.price_retail || item.price);

      finalItemPrice = calc.pricePerKg; // цена за 1 кг с учетом наценки
      calculatedTotalPrice += calc.totalPrice; // добавляем полную стоимость позиции (+40 грн резки)
    } else {
      calculatedTotalPrice += finalItemPrice * parseInt(item.quantity);
    }

    return {
      ...item,
      price: finalItemPrice,
    };
  });

  // 1. Спочатку створюємо запис у таблиці orders
  const insertOrderQuery = `
    INSERT INTO orders (customer_name, customer_phone, customer_email, delivery_address, comment, total_price) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertOrderQuery,
    [
      customer.name,
      customer.phone,
      customer.email || '',
      customer.delivery,
      customer.comment || '',
      calculatedTotalPrice,
    ],
    (err, orderResult) => {
      if (err) {
        console.error('Помилка при створенні замовлення:', err);
        return res.status(500).json({ error: 'Помилка збереження замовлення' });
      }

      // Отримуємо ID щойно створеного замовлення
      const orderId = orderResult.insertId;

      // 2. Тепер додаємо всі товари з кошика у таблицю order_items
      const insertItemsQuery = `
      INSERT INTO order_items (order_id, product_id, product_name, product_manufacturer, diameter, weight, price, quantity, selected_type) 
      VALUES ?
    `;

      // Формуємо масив масивів для масової вставки (Bulk Insert) у MySQL
      const itemsData = validatedItems.map((item) => [
        orderId,
        item.productId,
        item.name,
        item.manufacturer,
        item.diameter || '',
        item.weight || '',
        item.price,
        item.quantity,
        item.selectedType,
      ]);

      db.query(insertItemsQuery, [itemsData], (itemErr) => {
        if (itemErr) {
          console.error('Помилка при збереженні товарів замовлення:', itemErr);
          return res.status(500).json({ error: 'Помилка збереження товарів' });
        }

        sendTelegramNotification(customer, validatedItems, calculatedTotalPrice, orderId);

        if (customer.email) {
          sendOrderEmail(customer, validatedItems, calculatedTotalPrice, orderId).catch((err) => {
            console.error(`Не удалось отправить email для заказа №${orderId}:`, err.message);
          });
        }

        res
          .status(201)
          .json({ success: true, message: 'Замовлення успішно створено', orderId: orderId });
      });
    }
  );
});

app.get('/admin/orders', adminAuth, (req, res) => {
  const query = 'SELECT * FROM orders ORDER BY created_at DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка БД' });
    }
    res.json(results);
  });
});

app.get('/admin/orders/:id/items', adminAuth, (req, res) => {
  const query = 'SELECT * FROM order_items WHERE order_id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка БД' });
    }
    res.json(results);
  });
});

app.put('/admin/orders/:id', adminAuth, async (req, res) => {
  const orderId = Number(req.params.id);

  const { customer_name, customer_phone, customer_email, delivery_address, comment, items } =
    req.body;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: 'Некоректний ID замовлення',
    });
  }

  if (
    typeof customer_name !== 'string' ||
    !customer_name.trim() ||
    typeof customer_phone !== 'string' ||
    !customer_phone.trim() ||
    typeof customer_email !== 'string' ||
    !customer_email.trim() ||
    typeof delivery_address !== 'string' ||
    !delivery_address.trim()
  ) {
    return res.status(400).json({
      error: "Заповніть ім'я, телефон, email та адресу доставки",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'У замовленні має бути хоча б один товар',
    });
  }

  // Проверяем все позиции до обращения к БД
  for (const item of items) {
    const productId = Number(item.product_id);
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        error: 'Перевірте ID товарів, ціни та кількість',
      });
    }

    if (
      item.selected_type != null &&
      !['retail', 'company', 'wholesale'].includes(item.selected_type)
    ) {
      return res.status(400).json({
        error: 'Некоректний тип ціни',
      });
    }
  }

  let connection;
  let transactionStarted = false;

  const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
      connection.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

  try {
    // Получаем соединение из пула mysql2
    connection = await new Promise((resolve, reject) => {
      db.getConnection((err, conn) => {
        if (err) return reject(err);
        resolve(conn);
      });
    });

    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    transactionStarted = true;

    // Проверяем существование заказа
    const orders = await query('SELECT id FROM orders WHERE id = ? FOR UPDATE', [orderId]);

    if (orders.length === 0) {
      const error = new Error('Замовлення не знайдено');
      error.statusCode = 404;
      throw error;
    }

    // Получаем актуальные данные товаров
    const productIds = [...new Set(items.map((item) => Number(item.product_id)))];

    const products = await query(
      `SELECT
         p.id,
         p.name,
         p.diameter,
         p.weight,
         m.name AS manufacturer_name
       FROM products p
       LEFT JOIN manufacturers m
         ON p.manufacturer_id = m.id
       WHERE p.id IN (?)`,
      [productIds]
    );

    const productsMap = new Map(products.map((product) => [Number(product.id), product]));

    if (productsMap.size !== productIds.length) {
      const error = new Error('Один або декілька товарів не знайдені');
      error.statusCode = 400;
      throw error;
    }

    // Цена вводится администратором вручную
    let totalPrice = 0;

    const itemsData = items.map((item) => {
      const product = productsMap.get(Number(item.product_id));
      const price = Number(Number(item.price).toFixed(2));
      const quantity = Number(item.quantity);

      totalPrice += price * quantity;

      return [
        orderId,
        product.id,
        product.name,
        product.manufacturer_name || '',
        product.diameter || '',
        product.weight || '',
        price,
        quantity,
        item.selected_type || 'retail',
      ];
    });

    totalPrice = Number(totalPrice.toFixed(2));

    // Обновляем данные клиента и итоговую сумму
    await query(
      `UPDATE orders
       SET customer_name = ?,
           customer_phone = ?,
           customer_email = ?,
           delivery_address = ?,
           comment = ?,
           total_price = ?
       WHERE id = ?`,
      [
        customer_name.trim(),
        customer_phone.trim(),
        customer_email.trim(),
        delivery_address.trim(),
        typeof comment === 'string' ? comment : '',
        totalPrice,
        orderId,
      ]
    );

    // Заменяем старые позиции новыми
    await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

    await query(
      `INSERT INTO order_items
       (
         order_id,
         product_id,
         product_name,
         product_manufacturer,
         diameter,
         weight,
         price,
         quantity,
         selected_type
       )
       VALUES ?`,
      [itemsData]
    );

    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    transactionStarted = false;

    return res.json({
      success: true,
      total_price: totalPrice,
    });
  } catch (err) {
    if (connection && transactionStarted) {
      await new Promise((resolve) => {
        connection.rollback(() => resolve());
      });
    }

    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
      });
    }

    console.error('Помилка оновлення замовлення:', err);

    return res.status(500).json({
      error: 'Помилка збереження замовлення',
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/admin/orders/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  const query = 'UPDATE orders SET status = ? WHERE id = ?';
  db.query(query, [status, req.params.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка оновлення статусу' });
    }
    res.json({ success: true });
  });
});

app.delete('/admin/orders/:id', adminAuth, (req, res) => {
  const query = 'DELETE FROM orders WHERE id = ?';
  db.query(query, [req.params.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка видалення' });
    }
    res.json({ success: true });
  });
});

// POST - Быстрый заказ в 1 клик
app.post('/api/quick-order', (req, res) => {
  const { productId, productName, price, quantity = 1, phone, name } = req.body;

  if (!phone || !productName) {
    return res.status(400).json({ error: "Номер телефону є обов'язковим" });
  }

  // 1. Получаем полные данные о товаре из базы
  const getProductQuery = `
    SELECT p.*, m.name AS manufacturer_name 
    FROM products p 
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id 
    WHERE p.id = ?
  `;

  db.query(getProductQuery, [productId], (prodErr, results) => {
    const product = results && results.length > 0 ? results[0] : null;

    const qty = parseInt(quantity) || 1;
    let finalItemPrice = parseFloat(price) || 0;
    let totalPrice = finalItemPrice * qty;
    let cutFee = 0;
    let pricePerKg = finalItemPrice;

    const unit = product ? product.unit || 'шт' : 'шт';
    const hasDynamic = product ? product.has_dynamic_pricing : false;
    const manufacturerName = product ? product.manufacturer_name || '' : '';

    // Если у товара динамическая цена — считаем через вашу серверную функцию
    if (product && hasDynamic) {
      const calc = calculateDynamicPrice(product, qty, product.price_retail || finalItemPrice);
      pricePerKg = calc.pricePerKg;
      cutFee = calc.cutFee;
      totalPrice = calc.totalPrice;
      finalItemPrice = pricePerKg;
    }

    const customerName = name && name.trim() !== '' ? name : 'Швидке замовлення';
    const deliveryAddress = 'Замовлення в 1 клік (уточнити по телефону)';

    // 2. Создаем запись в orders
    const insertOrderQuery = `
      INSERT INTO orders (customer_name, customer_phone, customer_email, delivery_address, comment, total_price) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertOrderQuery,
      [customerName, phone, '', deliveryAddress, '⚡ Замовлення в 1 клік', totalPrice.toFixed(2)],
      (err, orderResult) => {
        if (err) {
          console.error('Помилка при створенні швидкого замовлення:', err);
          return res.status(500).json({ error: 'Помилка збереження замовлення' });
        }

        const orderId = orderResult.insertId;

        // 3. Сохраняем товар с реальным количеством в order_items
        const insertItemQuery = `
          INSERT INTO order_items (order_id, product_id, product_name, product_manufacturer, diameter, weight, price, quantity, selected_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertItemQuery,
          [
            orderId,
            productId,
            productName,
            manufacturerName,
            product ? product.diameter || '' : '',
            product ? product.weight || '' : '',
            finalItemPrice,
            qty,
            'retail',
          ],
          async (itemErr) => {
            if (itemErr) {
              console.error('Помилка при збереженні товару швидкого замовлення:', itemErr);
            }

            // 4. Формируем сообщение в Telegram с учетом порезки и единиц измерения
            const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || '').split(',');

            let message = `⚡ <b>ШВИДКЕ ЗАМОВЛЕННЯ #${orderId}!</b>\n\n`;
            if (name && name.trim() !== '') message += `👤 <b>Клієнт:</b> ${name}\n`;
            message += `📞 <b>Телефон:</b> <code>${phone}</code>\n`;
            message += `📍 <b>Доставка:</b> ${deliveryAddress}\n\n`;

            message += `🛒 <b>ТОВАР:</b>\n`;
            message += `1. ${productName} `;
            if (product && product.diameter) message += `(Ø ${product.diameter} мм) `;
            if (product && product.weight && !hasDynamic) message += `[${product.weight} кг] `;

            if (manufacturerName) {
              message += `\n  <b>Виробник:</b> ${manufacturerName}`;
            }

            if (hasDynamic) {
              message += `\n  К-ть: ${qty} ${unit} (${pricePerKg} грн/${unit} + порізка ${cutFee} грн) | Сума: ${totalPrice.toFixed(2)} грн\n`;
            } else {
              message += `\n  Ціна: ${finalItemPrice.toFixed(2)} грн/${unit} | К-ть: ${qty} ${unit} | Сума: ${totalPrice.toFixed(2)} грн\n`;
            }

            message += `\n💰 <b>Всього до сплати: ${totalPrice.toFixed(2)} грн</b>\n\n`;
            message += `🔔 <i>Терміново перетелефонуйте клієнту для уточнення доставки!</i>`;

            const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

            for (const chatId of CHAT_IDS) {
              if (!chatId) continue;
              try {
                await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                  }),
                });
              } catch (tgErr) {
                console.error(`Помилка відправки швидкого замовлення в ТГ (${chatId}):`, tgErr);
              }
            }

            res.status(201).json({
              success: true,
              message: 'Швидке замовлення успішно створено',
              orderId: orderId,
            });
          }
        );
      }
    );
  });
});

// GET - Генерація XML-фіду товарів для Google Merchant Center
app.get('/feed.xml', (req, res) => {
  const query = `
    SELECT
      p.*,
      m.name AS manufacturer_name
    FROM products p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Помилка генерації фіду:', err);
      return res.status(500).send('Server error');
    }

    // Допоміжна функція для екранування спецсимволів (обов'язково для XML)
    const escapeXml = (unsafe) => {
      return (unsafe || '').toString().replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '&':
            return '&amp;';
          case "'":
            return '&apos;';
          case '"':
            return '&quot;';
          default:
            return c;
        }
      });
    };

    // Формуємо шапку XML-документа
    let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
    xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
    xml += '<channel>\n';
    xml += '  <title>Wolfram Shop</title>\n';
    xml += '  <link>https://wolfram-shop.com.ua/</link>\n';
    xml +=
      '  <description>Спеціалізовані зварювальні матеріали (дріт, електроди, прутки)</description>\n';

    // Проходимось по кожному товару і додаємо його у фід
    results.forEach((product) => {
      const price = product.is_wholesale
        ? parseFloat(product.price_wholesale) || parseFloat(product.price) || 0
        : parseFloat(product.price_retail) || parseFloat(product.price) || 0;

      if (price === 0) return;

      const title = escapeXml(product.name);
      // Якщо опису немає, дублюємо назву
      const description = escapeXml(product.description || product.name);
      const link = `https://wolfram-shop.com.ua/product/${createSlug(product.name)}-${product.id}`;

      // Формуємо оптимізоване посилання на картинку (як у вас на фронтенді)
      let imageLink = escapeXml(product.image || '');
      if (imageLink.includes('cloudinary.com') && imageLink.includes('/upload/')) {
        imageLink = imageLink.replace('/upload/', '/upload/f_auto,q_auto,w_800/');
      }

      const availability = product.stock > 0 ? 'in_stock' : 'out_of_stock';
      const brand = escapeXml(product.manufacturer_name || 'Wolfram');

      xml += '  <item>\n';
      xml += `    <g:id>${product.id}</g:id>\n`;
      xml += `    <g:title>${title}</g:title>\n`;
      xml += `    <g:description>${description}</g:description>\n`;
      xml += `    <g:link>${link}</g:link>\n`;
      xml += `    <g:image_link>${imageLink}</g:image_link>\n`;
      xml += `    <g:condition>new</g:condition>\n`;
      xml += `    <g:availability>${availability}</g:availability>\n`;
      xml += `    <g:price>${price.toFixed(2)} UAH</g:price>\n`;
      xml += `    <g:brand>${brand}</g:brand>\n`;
      xml += '  </item>\n';
    });

    xml += '</channel>\n';
    xml += '</rss>';

    // Вказуємо браузеру та Гуглу, що це саме XML-документ
    res.set('Content-Type', 'text/xml');
    res.send(xml);
  });
});

// GET - Динамічна генерація sitemap.xml для Google Search Console
app.get('/sitemap.xml', (req, res) => {
  const categoriesQuery = 'SELECT id, name FROM categories';
  const productsQuery = 'SELECT id, name FROM products';

  db.query(categoriesQuery, (err, categories) => {
    if (err) {
      console.error('Помилка sitemap (категорії):', err);
      return res.status(500).send('Server error');
    }

    db.query(productsQuery, (pErr, products) => {
      if (pErr) {
        console.error('Помилка sitemap (товари):', pErr);
        return res.status(500).send('Server error');
      }

      const baseUrl = 'https://wolfram-shop.com.ua';

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // 1. Статичні сторінки
      const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/about.html', priority: '0.8', changefreq: 'monthly' },
        { url: '/delivery.html', priority: '0.8', changefreq: 'monthly' },
      ];

      staticPages.forEach((page) => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      });

      // 2. Сторінки категорій
      categories.forEach((cat) => {
        const catUrl = `${baseUrl}/category/${createSlug(cat.name)}-${cat.id}`;
        xml += '  <url>\n';
        xml += `    <loc>${catUrl}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      });

      // 3. Сторінки товарів
      products.forEach((prod) => {
        const productUrl = `${baseUrl}/product/${createSlug(prod.name)}-${prod.id}`;

        xml += '  <url>\n';
        xml += `    <loc>${productUrl}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });

      xml += '</urlset>';

      res.set('Content-Type', 'text/xml');
      res.send(xml);
    });
  });
});
