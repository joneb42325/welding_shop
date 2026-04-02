const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./db');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Server is working');
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

app.get('/products/special', (req, res) => {
  const query = `
    SELECT 
      p.*,
      COALESCE(SUM(o.stock), 0) as total_stock
    FROM products p
    LEFT JOIN product_options o ON o.product_id = p.id
    WHERE p.is_special = 1
    GROUP BY p.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/products/category/:id', (req, res) => {
  const categoryId = req.params.id;
  const query = `
    SELECT p.*, COALESCE(SUM(o.stock), 0) as total_stock
    FROM products p
    LEFT JOIN product_options o ON o.product_id = p.id
    WHERE p.category_id = ?
    GROUP BY p.id`;

  db.query(query, [categoryId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});

app.get('/categories/:id/info', (req, res) => {
  const query = 'SELECT name FROM categories WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results[0]);
  });
});

app.get('/categories', (req, res) => {
  const query = 'SELECT * FROM categories';

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    res.json(results);
  });
});

app.get('/product-options/:id', (req, res) => {
  const productId = req.params.id;

  const query = `
  SELECT 
  m.name as manufacturer,
  o.diameter,
  o.weight,
  o.stock,
  o.price_retail,
  o.price_company,
  o.price_wholesale
  FROM product_options o
  JOIN manufacturers m ON o.manufacturer_id = m.id
  WHERE o.product_id = ?
  `;

  db.query(query, [productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

app.get('/product/:id', (req, res) => {
  const productId = req.params.id;

  const sql = `
    SELECT name, description, image
    FROM products p
    WHERE id = ?
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    res.json(results[0]);
  });
});

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const sessionStore = new MySQLStore({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'welding_shop',
});

app.use(
  session({
    secret: 'secret_solyara',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 1 день
    },
  })
);
/*

app.use(
  session({
    secret: "secret_solyara",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
    },
  }),
);
*/

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === '1234') {
    req.session.isAdmin = true;
    return res.json({ success: true });
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
  const query = 'SELECT * FROM categories WHERE id = ?';

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
  const image = req.file.filename;

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

  if (req.file) {
    const newImage = req.file.filename;
    const query = 'UPDATE categories SET name = ?, image = ? WHERE id = ?';

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

//DELETE

app.delete('/admin/categories/:id', adminAuth, (req, res) => {
  const id = req.params.id;

  const getImgQuery = 'SELECT image FROM categories WHERE id = ?';

  db.query(getImgQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

    if (results.length > 0 && results[0].image) {
      const imagePath = path.join(__dirname, 'public/images', results[0].image);

      fs.unlink(imagePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Помилка видалення файлу зображення:', err);
        }
      });
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

//GET
app.get('/admin/products', adminAuth, (req, res) => {
  const query = `
    SELECT
    p.*,
    c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.id DESC
`;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error:' });
    res.json(results);
  });
});

//GET BY ID
app.get('/admin/products/:id', adminAuth, (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT id, name, description, image, category_id, is_special
    FROM products
    WHERE id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Помилка БД' });
    if (results.length === 0) return res.status(404).json({ error: 'Товар не знайдено' });

    res.json(results[0]);
  });
});

app.post('/admin/products', adminAuth, upload.single('image'), (req, res) => {
  const { name, category_id, description, is_special } = req.body;
  const image = req.file ? req.file.filename : null;

  const query =
    'INSERT INTO products (name, category_id, description, image, is_special) VALUES (?, ?, ?, ?, ?)';

  db.query(query, [name, category_id, description, image, is_special], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка БД' });
    }
    res.json({ success: true });
  });
});

app.put('/admin/products/:id', adminAuth, upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { name, category_id, description, is_special } = req.body;

  const specialVal = is_special ? 1 : 0;

  const getOldImgQuery = 'SELECT image FROM products WHERE id = ?';

  db.query(getOldImgQuery, [id], (err, results) => {
    if (err) {
      console.error('Помилка пошуку товару:', err);
      return res.status(500).json({ error: 'Помилка бази даних' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    const oldImageName = results[0].image;

    let query;
    let params;

    if (req.file) {
      // ФОТО ЗМІНЮЄТЬСЯ
      query =
        'UPDATE products SET name = ?, category_id = ?, description = ?, is_special = ?, image = ? WHERE id = ?';
      params = [name, category_id, description, specialVal, req.file.filename, id];

      // Видаляємо старий файл з диска, якщо він був
      if (oldImageName) {
        const oldImagePath = path.join(__dirname, 'public/images', oldImageName);
        fs.unlink(oldImagePath, (fsErr) => {
          if (fsErr && fsErr.code !== 'ENOENT') {
            console.error('Не вдалося видалити старе фото:', fsErr);
          }
        });
      }
    } else {
      // ФОТО НЕ ЗМІНЮЄТЬСЯ
      query =
        'UPDATE products SET name = ?, category_id = ?, description = ?, is_special = ? WHERE id = ?';
      params = [name, category_id, description, specialVal, id];
    }

    db.query(query, params, (updateErr) => {
      if (updateErr) {
        console.error('Помилка оновлення БД:', updateErr);
        return res.status(500).json({ error: 'Помилка при збереженні даних' });
      }
      res.json({ success: true });
    });
  });
});

app.delete('/admin/products/:id', adminAuth, (req, res) => {
  const id = req.params.id;

  const getImgQuery = 'SELECT image FROM products WHERE id = ?';
  db.query(getImgQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Помилка сервера' });

    const imageName = results.length > 0 ? results[0].image : null;

    if (imageName) {
      const imagePath = path.join(__dirname, 'public/images', imageName);
      fs.unlink(imagePath, (fsErr) => {
        if (fsErr && fsErr.code !== 'ENOENT') {
          console.error('Помилка видалення зображення:', fsErr);
        }
      });
    }

    const deleteQuery = 'DELETE FROM products WHERE id = ?';
    db.query(deleteQuery, [id], (deleteErr) => {
      if (deleteErr) {
        console.error('Помилка видалення товару з БД:', deleteErr);
        return res.status(500).json({ error: 'Помилка сервера' });
      }
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

// GET all options for a product
app.get('/admin/product-options/product/:productId', adminAuth, (req, res) => {
  const productId = req.params.productId;
  const query = `
    SELECT
      po.id,
      po.product_id,
      m.name AS manufacturer,
      po.diameter,
      po.weight,
      po.price_retail,
      po.price_company,
      po.price_wholesale,
      po.stock
    FROM product_options po
    JOIN manufacturers m ON po.manufacturer_id = m.id
    WHERE po.product_id = ?
  `;
  db.query(query, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Помилка БД' });
    res.json(results);
  });
});

//GET BY ID

app.get('/admin/product-options/edit/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT * FROM product_options WHERE id = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length === 0) return res.status(404).json({ error: 'Опцію не знайдено' });
    res.json(results[0]);
  });
});

// GET all product-options
app.get('/admin/product-options/all', adminAuth, (req, res) => {
  const query = `
    SELECT 
      po.*, 
      p.name AS product_name,
      m.name AS manufacturer
    FROM product_options po
    JOIN products p ON po.product_id = p.id
    JOIN manufacturers m ON po.manufacturer_id = m.id
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
  });
});
// POST new product option
app.post('/admin/product-options', adminAuth, (req, res) => {
  const {
    product_id,
    manufacturer_id,
    diameter,
    weight,
    price_retail,
    price_company,
    price_wholesale,
    stock,
  } = req.body;
  const query = `
    INSERT INTO product_options
    (product_id, manufacturer_id, diameter, weight, price_retail, price_company, price_wholesale, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    query,
    [
      product_id,
      manufacturer_id,
      diameter,
      weight,
      price_retail,
      price_company,
      price_wholesale,
      stock,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: 'Помилка БД' });
      res.json({ success: true });
    }
  );
});

// PUT update product option
app.put('/admin/product-options/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const { manufacturer_id, diameter, weight, price_retail, price_company, price_wholesale, stock } =
    req.body;
  const query = `
    UPDATE product_options
    SET manufacturer_id = ?, diameter = ?, weight = ?, price_retail = ?, price_company = ?, price_wholesale = ?, stock = ?
    WHERE id = ?
  `;
  db.query(
    query,
    [manufacturer_id, diameter, weight, price_retail, price_company, price_wholesale, stock, id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Помилка БД' });
      res.json({ success: true });
    }
  );
});

// DELETE product option
app.delete('/admin/product-options/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM product_options WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: 'Помилка БД' });
    res.json({ success: true });
  });
});

// POST - Створення нового замовлення
app.post('/api/orders', (req, res) => {
  const { customer, items, totalPrice } = req.body;

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
      totalPrice,
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
      const itemsData = items.map((item) => [
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

        // Якщо все пройшло успішно, відправляємо відповідь фронтенду
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
