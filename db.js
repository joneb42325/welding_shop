const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'welding_shop',
});

db.connect((err) => {
  if (err) {
    console.error('Помилка підключення:', err);
  } else {
    console.log('MySQL підключена успішно');
  }
});

module.exports = db;
