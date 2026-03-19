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
  const query = "SELECT * FROM products WHERE is_special=1";
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
  const query = "SELECT * FROM products WHERE category_id = ?";
  db.query(query, [categoryId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

app.get("/categories/:id", (req, res) => {
  const categoryId = req.params.id;

  const query = "SELECT * FROM categories WHERE id = ?";

  db.query(query, [categoryId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }

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
    FROM products
    WHERE id = ?
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });

    res.json(results[0]);
  });
});
