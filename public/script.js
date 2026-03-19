const specialContainer = document.getElementById("special-products-container");

//fetch("http://localhost:3000/products")
fetch("/products/special")
  .then((response) => response.json())
  .then((products) => {
    products.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="images/${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>Ціна: ${product.price} грн</p>
      `;
      specialContainer.appendChild(card);
    });
  })
  .catch((err) => console.error("Error loading products", err));

const params = new URLSearchParams(window.location.search);
const categoryId = params.get("categoryId");
const categoryContainer = document.getElementById(
  "category-products-container",
);

fetch(`/products/category/${categoryId}`)
  .then((response) => response.json())
  .then((products) => {
    products.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
      <img src="images/${product.image}" alt="${product.name}">
      <a href="product.html?productId=${product.id}">
          <h3>${product.name}</h3>
        </a>
        <p>Ціна: ${product.price} грн</p>
      `;
      categoryContainer.appendChild(card);
    });
  })
  .catch((err) => console.error("Error loading products", err));

const categoryTitle = document.getElementById("category-title");

fetch(`/categories/${categoryId}`)
  .then((response) => response.json())
  .then((category) => {
    categoryTitle.textContent = category.name;
  });

const catalogList = document.getElementById("catalog-list");

const catalogContainer = document.getElementById("catalog-container");

fetch("/categories")
  .then((res) => res.json())
  .then((categories) => {
    categories.forEach((category) => {
      //sidebar
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="category.html?categoryId=${category.id}">
          ${category.name}
        </a>
      `;
      if (catalogList) catalogList.appendChild(li);

      //grid catalog
      const card = document.createElement("div");
      card.classList.add("catalog-item");
      card.innerHTML = `
          <img src="images/${category.image}" alt="${category.name}">
          <a href="category.html?categoryId=${category.id}">
            ${category.name}
          </a>
        `;
      if (catalogContainer) catalogContainer.appendChild(card);
    });
  });

// product page
const productId = params.get("productId");

fetch(`/product-options/${productId}`)
  .then((res) => res.json())
  .then((data) => renderTables(data))
  .catch((err) => console.error(err));

function renderTables(data) {
  const container = document.getElementById("manufacturer-tables");
  container.innerHTML = "";

  const grouped = {};

  data.forEach((item) => {
    if (!grouped[item.manufacturer]) {
      grouped[item.manufacturer] = [];
    }
    grouped[item.manufacturer].push(item);
  });

  for (const manufacturer in grouped) {
    const section = document.createElement("div");
    section.classList.add("manufacturer-block");

    section.innerHTML = `
    <h3>${manufacturer}</h3>
    <table>
    <thead>
    <tr>
       <th>Діаметр</th>
            <th>Вага</th>
            <th>ЧП</th>
            <th>ТОВ</th>
            <th>Опт</th>
    </tr>
    </thead>
    <tbody></tbody>
    </table>
    `;

    const tbody = section.querySelector("tbody");

    grouped[manufacturer].forEach((item) => {
      let selectedType = "retail";
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${item.diameter}</td>
        <td>${item.weight} кг</td>
        <td class="price-cell active" data-type="retail">${item.price_retail}</td>
        <td class="price-cell" data-type="company">${item.price_company}</td>
        <td class="price-cell" data-type="wholesale">${item.price_wholesale}</td>
        <td>
        <button class="add-to-cart">В кошик</button>
        </td>
      `;

      row.querySelectorAll(".price-cell").forEach((cell) => {
        cell.addEventListener("click", () => {
          selectedType = cell.dataset.type;
          row
            .querySelectorAll(".price-cell")
            .forEach((c) => c.classList.remove("active"));
          cell.classList.add("active");
        });
      });
      row.querySelector(".add-to-cart").addEventListener("click", () => {
        const price = item[`price_${selectedType}`];
      });
      tbody.appendChild(row);
    });
    container.appendChild(section);
  }
}

fetch(`/product/${productId}`)
  .then((res) => res.json())
  .then((product) => {
    document.getElementById("product-name").textContent = product.name;
    document.getElementById("product-description").textContent =
      product.description;
    document.getElementById("product-image").src = "images/" + product.image;
  });
