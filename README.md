# 🛒 Wolfram Shop

A modern e-commerce platform for selling welding equipment, materials, and accessories.

The project was developed from scratch with a focus on:
- ⚡ high performance;
- 🧠 flexible pricing system;
- 🔐 convenient admin panel;
- 🛍 dynamic shopping cart.

---

# ✨ Key Features

## 🧠 Smart Dynamic Shopping Cart
- Real-time automatic price recalculation.
- Support for multiple pricing types:
  - Retail
  - Business / Bank Transfer
  - Wholesale
- Automatic wholesale pricing when the `wholesale_threshold` is reached.
- Cart state persistence using `localStorage`.

---

## 🔐 Admin Panel
- CRUD operations for:
  - products;
  - categories;
  - manufacturers.
- Product pricing and wholesale threshold management.
- Uploading and editing product images.
- Catalog management without direct database interaction.

---

## ⚡ Performance
- Frontend built with pure JavaScript (Vanilla JS).
- Minimal dependencies.
- Fast page loading.
- Asynchronous interaction using Fetch API.

---

# 🛠 Technologies

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Fetch API

## Backend
- Node.js
- Express.js
- Multer
- MySQL

---

# 🚀 Installation & Setup

## Requirements

Before running the project, make sure you have installed:

- Node.js
- MySQL Server
- Git

---

## 1. Clone the Repository

```bash
git clone git@github.com:YOUR_USERNAME/YOUR_REPOSITORY.git
```

---

## 2. Navigate to the Project Directory

```bash
cd YOUR_REPOSITORY
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Configure Environment Variables

Create a `.env` file in the project root and add:

```env
SESSION_SECRET=your_session_secret
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
ADMIN_PASS=adminpassword
DB_NAME=yourdatabase
PORT=3000
```

---

## 5. Database Setup

### Create a MySQL database:

```sql
CREATE DATABASE yourdatabase;
```

### Import the SQL schema (if a dump file exists):

```bash
mysql -u root -p yourdatabase < database.sql
```

---

## 6. Run the Server

```bash
node server.js
```

### For development mode:

```bash
nodemon server.js
```

---

## 7. Open the Application

After starting the server, the project will be available at:

```text
http://localhost:3000
```

---

# 📁 Project Structure

```text
/public
│
├── css/                 # Interface styles
├── js/                  # Client-side JavaScript files
│   ├── cart.js
│   ├── cart-page.js
│   ├── admin.js
│   └── ...
├── images/              # Uploaded product images
├── admin/               # Admin panel client files
└── index.html

server.js                # Backend server
package.json             # npm dependencies and configuration
.env                     # Environment variables
```

---

# 🔧 Backend Features

- REST API for product management.
- MySQL database integration.
- Pricing business logic.
- File upload handling with Multer.
- Dynamic shopping cart generation.
- Asynchronous frontend/backend interaction.

---

# 🛍 Store Functionality

- Product catalog.
- Categories and manufacturers.
- Dynamic shopping cart.
- Wholesale pricing system.
- Product search and filtering.
- Cart state persistence.
- Admin panel.

---

# 🔒 Security

Do not upload the `.env` file to the Git repository.

The project uses sensitive environment variables:
- database credentials;
- session secret;
- admin credentials.

It is recommended to add `.env` to `.gitignore`.

---

# 👤 Author

**Vladyslav Kovba**

- GitHub: `@joneb2325`
- Telegram: `@dogkeh`

---

# 📄 License

This project was created for educational and commercial purposes.
