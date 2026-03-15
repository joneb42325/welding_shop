const specialContainer = document.getElementById("special-products-container");
const categoryContainer = document.getElementById(
  "category-products-container",
);

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
        <button data-id="${product.id}">Додати в корзину</button>
      `;
      specialContainer.appendChild(card);
    });
  })
  .catch((err) => console.error("Error loading products", err));

const params = new URLSearchParams(window.location.search);
const categoryId = params.get("categoryId");

fetch(`/products/category/${categoryId}`)
  .then((response) => response.json())
  .then((products) => {
    products.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
      <h3>${product.name}</h3>
        <p>Ціна: ${product.price} грн</p>
        <button data-id="${product.id}">Додати в корзину</button>
      `;
      categoryContainer.appendChild(card);
    });
  })
  .catch((err) => console.error("Error loading products", err));

const categoryImage = document.getElementById("category-image");
const categoryTitle = document.getElementById("category-title");

fetch(`/categories/${categoryId}`)
  .then((response) => response.json())
  .then((category) => {
    categoryImage.src = `images/${category.image}`;
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
