const express = require("express");
const multer = require("multer");
const db = require("./db");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});

app.get("/products/special", (req, res) => {
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
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

app.get("/products/category/:id", (req, res) => {
  const categoryId = req.params.id;
  const query = `
    SELECT p.*, COALESCE(SUM(o.stock), 0) as total_stock
    FROM products p
    LEFT JOIN product_options o ON o.product_id = p.id
    WHERE p.category_id = ?
    GROUP BY p.id`;

  db.query(query, [categoryId], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json(results);
  });
});

app.get("/categories/:id/info", (req, res) => {
  const query = "SELECT name FROM categories WHERE id = ?";
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json(results[0]);
  });
});

app.get("/categories", (req, res) => {
  const query = "SELECT * FROM categories";

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Server error" });
    }

    res.json(results);
  });
});

app.get("/product-options/:id", (req, res) => {
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
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

app.get("/product/:id", (req, res) => {
  const productId = req.params.id;

  const sql = `
    SELECT name, description, image
    FROM products p
    WHERE id = ?
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });

    res.json(results[0]);
  });
});

const session = require("express-session");

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

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  res.status(401).json({ error: "Невірний логін або пароль" });
});

function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/admin/products", adminAuth, (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json(results);
  });
});

app.get("/admin", (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.sendFile(__dirname + "/public/admin/index.html");
  } else {
    res.redirect("/admin/login.html");
  }
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});
