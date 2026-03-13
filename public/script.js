const container = document.getElementById("special-products-container");

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
      container.appendChild(card);
    });
  })
  .catch((err) => console.error("Error loading products", err));
