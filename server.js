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
