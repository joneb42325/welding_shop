require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./db');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinaryConfig');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Server is working');
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
    public_id: (req, file) => Date.now() + '-' + file.originalname.split('.')[0],
  },
});

/*
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
 */

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

app.get('/products/category/:id', (req, res) => {
  const categoryId = req.params.id;
  const query = `
    SELECT
      p.*,
      p.stock AS total_stock,
      m.name AS manufacturer_name
    FROM products p
           LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.category_id = ?
  `;

  db.query(query, [categoryId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(results);
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

app.get('/api/search', (req, res) => {
  const searchTerm = req.query.q;
  if (!searchTerm) return res.json([]);

  // 1. Розбиваємо запит на масив слів (наприклад, ["Дріт", "0.8", "мм"])
  const words = searchTerm.split(' ').filter((word) => word.length > 0);

  // 2. Будуємо складний запит динамічно
  // Для кожного слова ми перевіряємо всі ключові колонки
  let conditions = [];
  let params = [];

  words.forEach((word) => {
    const p = `%${word}%`;
    conditions.push(
      `(p.name LIKE ? OR p.description LIKE ? OR o.diameter LIKE ? OR m.name LIKE ?)`
    );
    params.push(p, p, p, p);
  });

  const query = `
    SELECT DISTINCT p.* 
    FROM products p
    LEFT JOIN product_options o ON p.id = o.product_id
    LEFT JOIN manufacturers m ON o.manufacturer_id = m.id
    WHERE ${conditions.join(' AND ')} 
    LIMIT 10`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Search error:', err);
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

app.get('/product/:id', (req, res) => {
  const productId = req.params.id;

  const sql = `
    SELECT
      p.*,
      m.name AS manufacturer_name,
      p.stock AS total_stock  
    FROM products p
           LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.id = ?
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });

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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
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

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === process.env.ADMIN_PASS) {
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

  query += ` ORDER BY p.id DESC`;

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
    manufacturer_id,
    diameter,
    weight,
    price_retail,
    price_company,
    price_wholesale,
    stock,
  } = req.body;

  const image = req.file ? req.file.path : null;
  const isSpecial = is_special ? 1 : 0;
  const sql = `
    INSERT INTO products
    (name, category_id, description, image, is_special, manufacturer_id, diameter, weight, price_retail, price_company, price_wholesale, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      category_id,
      description,
      image,
      isSpecial,
      manufacturer_id,
      diameter,
      weight,
      price_retail || 0,
      price_company || 0,
      price_wholesale || 0,
      stock || 0,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: 'Помилка БД' });
      res.status(201).json({ success: true });
    }
  );
});

app.put('/admin/products/:id', adminAuth, upload.single('image'), (req, res) => {
  const productId = req.params.id;

  // 1. Отримуємо всі поля з тіла запиту (всі вони тепер в одній таблиці)
  const {
    name,
    category_id,
    description,
    is_special,
    manufacturer_id,
    diameter,
    weight,
    price_retail,
    price_company,
    price_wholesale,
    stock,
  } = req.body;

  // Форматування даних для БД
  const specialVal = is_special ? 1 : 0;
  const mId = manufacturer_id ? parseInt(manufacturer_id) : null;
  const pRetail = parseFloat(price_retail) || 0;
  const pCompany = parseFloat(price_company) || 0;
  const pWholesale = parseFloat(price_wholesale) || 0;
  const s = parseInt(stock) || 0;

  // Пошук старої картинки для видалення з Cloudinary (якщо завантажено нову)
  db.query('SELECT image FROM products WHERE id = ?', [productId], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Помилка бази даних' });
    if (results.length === 0) return res.status(404).json({ error: 'Товар не знайдено' });

    const oldImage = results[0].image;
    let query;
    let params;

    // 2. Формуємо єдиний запит UPDATE для таблиці products
    if (req.file) {
      // Якщо завантажено нове фото
      query = `
        UPDATE products SET 
          name = ?, category_id = ?, description = ?, is_special = ?, manufacturer_id = ?, 
          diameter = ?, weight = ?, price_retail = ?, price_company = ?, price_wholesale = ?, stock = ?, image = ? 
        WHERE id = ?
      `;
      params = [
        name,
        category_id,
        description,
        specialVal,
        mId,
        diameter,
        weight,
        pRetail,
        pCompany,
        pWholesale,
        s,
        req.file.path,
        productId,
      ];
    } else {
      // Якщо фото не змінювалось
      query = `
        UPDATE products SET 
          name = ?, category_id = ?, description = ?, is_special = ?, manufacturer_id = ?, 
          diameter = ?, weight = ?, price_retail = ?, price_company = ?, price_wholesale = ?, stock = ? 
        WHERE id = ?
      `;
      params = [
        name,
        category_id,
        description,
        specialVal,
        mId,
        diameter,
        weight,
        pRetail,
        pCompany,
        pWholesale,
        s,
        productId,
      ];
    }

    // 3. Виконуємо оновлення
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

// GET all options for a product
app.get('/admin/product-options/product/:productId', adminAuth, (req, res) => {
  const productId = req.params.productId;
  const query = `
    SELECT
      po.id,
      po.product_id,
      po.diameter,
      po.weight,
      po.price_retail,
      po.price_company,
      po.price_wholesale,
      po.stock
    FROM product_options po
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
