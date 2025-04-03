import { gsap } from "gsap";
import { products, exclusiveOffers } from "./allProducts.js";
import { initializePaymentModal, openPaymentModal } from './payment-modal.js';

const SHEET_ID = "1csWDQuqU6U01kf8PD73fT4XsgKJJ_VtFpL1vmgXFQxc";
const SHEET_NAME = "Hoja 1";

let cart = [];
let currentProduct = null;

const productGrid = document.querySelector('.product-grid');
const offersGrid = document.querySelector('.offers-grid');
const modal = document.getElementById('product-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalImage = document.getElementById('modal-product-image');
const modalName = document.getElementById('modal-product-name');
const modalDescription = document.getElementById('modal-product-description');
const modalPrice = document.getElementById('modal-product-price');
const modalQuantityInput = document.getElementById('modal-quantity');
const modalAddToCartButton = document.getElementById('modal-add-to-cart');
const closeModalButton = document.getElementById('close-modal');
const quantityDecrementButton = document.getElementById('quantity-decrement');
const quantityIncrementButton = document.getElementById('quantity-increment');
const cartContainer = document.getElementById("cart-container");
const cartIcon = document.querySelector('.cart a');
const processPaymentButton = document.createElement('button');
// Modal specific elements for reviews
const modalRatingContainer = document.getElementById('modal-product-rating');
const modalReviewsContainer = document.getElementById('modal-product-reviews');

async function actualizarStockDesdeGoogleSheet() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq&sheet=${encodeURIComponent(SHEET_NAME)}`;

        const response = await fetch(url);
        const text = await response.text();
        const json = JSON.parse(text.substring(47, text.length - 2)); // Remove extra characters from Google JSON response

        const stockData = {};
        json.table.rows.forEach(row => {
            let nombreProducto = row.c[0].v.trim(); // Product name
            let stockDisponible = row.c[1].v; // Stock quantity

            stockData[nombreProducto] = stockDisponible;
        });

        actualizarHTMLConStock(stockData);
    } catch (error) {
        console.error("❌ Error updating stock:", error);
    }
}

function actualizarHTMLConStock(stockData) {
    document.querySelectorAll(".product-card, .producto").forEach(producto => {
        let nombreProducto = producto.getAttribute("data-nombre") || producto.querySelector('h3')?.textContent.trim();

        const stockElement = producto.querySelector(".stock");
        if (!stockElement) return;

        if (stockData[nombreProducto] !== undefined) {
            let stockDisponible = stockData[nombreProducto];
            
            stockElement.textContent = `Stock: ${stockDisponible}`;
            
            if (stockDisponible > 0) {
                stockElement.style.color = "green";
                producto.classList.remove('out-of-stock');
                producto.querySelectorAll('.view-details, .add-to-cart-main').forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('disabled');
                });
            } else {
                stockElement.textContent = "❌ Agotado";
                stockElement.style.color = "red";
                producto.classList.add('out-of-stock');
                producto.querySelectorAll('.view-details, .add-to-cart-main').forEach(btn => {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                });
            }
        } else {
            console.warn(`⚠ Product not found in Google Sheets: ${nombreProducto}`);
            stockElement.textContent = "Stock: Desconocido";
            stockElement.style.color = "grey";
        }
    });
}

function initializeAnimations() {
    gsap.from('header', { opacity: 0, duration: 1, y: -50 });
    gsap.from('.hero-content', { opacity: 0, duration: 1, delay: 0.5, y: 50 });
    gsap.from('.featured-products', { opacity: 0, duration: 1, delay: 1, y: 50 });
    gsap.from('.exclusive-offers', { opacity: 0, duration: 1, delay: 1.2, y: 50 });
    gsap.from('footer', { opacity: 0, duration: 1, delay: 1.5, y: 50 });
}

function renderProducts(category = null) {
    if (productGrid) {
        productGrid.innerHTML = ''; // Clear existing products
        const blueRate = parseFloat(localStorage.getItem('blueRate')) || null;

        const productsToRender = category ?
            products.filter(product => product.category === category) :
            products;

        productsToRender.forEach(product => {
            const productCard = createProductCard(product, blueRate);
            productCard.addEventListener('click', () => handleProductClick(product.id));
            productGrid.appendChild(productCard);
        });
        // After rendering, try to update stock immediately if data is available from a previous fetch
        actualizarStockDesdeGoogleSheet();
    } else {
        console.error("Product grid not found");
    }
}

function createOfferCountdown(offerCard, endTime) {
    const countdownElement = document.createElement('div');
    countdownElement.classList.add('offer-countdown');
    offerCard.appendChild(countdownElement);

    function updateCountdown() {
        const now = new Date().getTime();
        const timeLeft = endTime - now;

        if (timeLeft < 0) {
            countdownElement.innerHTML = 'Oferta expirada';
            countdownElement.classList.add('expired');
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `Termina en: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    // Initial call
    updateCountdown();

    // Update every second
    const countdownInterval = setInterval(() => {
        updateCountdown();
        const now = new Date().getTime();
        if (now >= endTime) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function renderExclusiveOffers() {
    if (!offersGrid) {
        console.error("Offers grid not found");
        return;
    }
    offersGrid.innerHTML = ''; // Clear existing offers
    const blueRate = parseFloat(localStorage.getItem('blueRate')) || null;

    // Shuffle the offers array
    const shuffledOffers = exclusiveOffers.sort(() => 0.5 - Math.random());

    // Select up to 3 random offers
    const selectedOffers = shuffledOffers.slice(0, 3);

    // Generate random end times for offers (between 1-3 days from now)
    const offerEndTimes = selectedOffers.map(() => {
        const randomDays = Math.floor(Math.random() * 3) + 1; // 1-3 days
        return new Date().getTime() + (randomDays * 24 * 60 * 60 * 1000);
    });

    selectedOffers.forEach((offer, index) => {
        const offerCard = createOfferCard(offer, blueRate);
        const addToCartButton = offerCard.querySelector('.add-to-cart-offer');

        // Add countdown
        createOfferCountdown(offerCard, offerEndTimes[index]);

        if (addToCartButton) {
            addToCartButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening modal
                const currentRate = parseFloat(localStorage.getItem('blueRate')) || 1;
                const priceInArs = (offer.price * currentRate).toFixed(2);
                addToCart(offer.id, offer.name, priceInArs, offer.image, 1, 'ARS');
            });
        }
        offersGrid.appendChild(offerCard);
    });
}

function initializeModalListeners() {
    if (modal) {
        closeModalButton?.addEventListener('click', closeModal);
        modalOverlay?.addEventListener('click', closeModal);
        quantityDecrementButton?.addEventListener('click', decrementQuantity);
        quantityIncrementButton?.addEventListener('click', incrementQuantity);
        modalAddToCartButton?.addEventListener('click', handleAddToCartFromModal);
    }
}

function initializeCartListeners() {
    const cartDiv = document.querySelector('.cart');
    if (cartDiv && cartContainer) {
        cartDiv.addEventListener('mouseenter', () => {
             if (cart.length > 0) {
                 cartContainer.style.display = 'block';
             }
        });
        cartDiv.addEventListener('mouseleave', () => {
             setTimeout(() => {
                 // Hide only if neither the icon area nor the dropdown itself is hovered
                 if (!cartDiv.matches(':hover') && !cartContainer.matches(':hover')) {
                     cartContainer.style.display = 'none';
                 }
             }, 150); // Slightly longer delay might feel better
        });
        // Keep mouseleave on the container itself as a fallback
        cartContainer.addEventListener('mouseleave', () => {
             // Check if the mouse moved back to the cart icon area before hiding
             if (!cartDiv.matches(':hover')) {
                cartContainer.style.display = 'none';
             }
        });
    }
}

function initializeCategoryFilters() {
    const categoryLinks = document.querySelectorAll('.categories-menu a');

    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.getAttribute('data-category');

            // Update active state in menu
            categoryLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            // Filter products
            if (category === 'all') {
                renderProducts(); // Show all products
            } else {
                renderFilteredProducts(category);
            }
        });
    });
}

function renderFilteredProducts(category) {
    if (!productGrid) {
        console.error("Product grid not found");
        return;
    }

    productGrid.innerHTML = ''; // Clear existing products
    const blueRate = parseFloat(localStorage.getItem('blueRate')) || null;

    // Filter products by category
    const filteredProducts = products.filter(product => product.category === category);

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<p class="no-products-message">No se encontraron productos en esta categoría.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = createProductCard(product, blueRate);
        productCard.addEventListener('click', () => handleProductClick(product.id));
        productGrid.appendChild(productCard);
    });
    // After rendering, try to update stock immediately if data is available
    actualizarStockDesdeGoogleSheet();
}

// --- Star Rating Generation ---
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    let starsHTML = '';

    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>'; // Full star
    }
    if (halfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>'; // Half star
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>'; // Empty star (using Font Awesome regular style)
    }
    return `<span class="stars">${starsHTML}</span>`;
}

function createProductCard(product, blueRate) {
    const card = document.createElement('div');
    card.classList.add('product-card', 'producto');
    card.dataset.id = product.id;
    card.dataset.nombre = product.name.trim().toLowerCase();

    let priceDisplay;
    if (product.price) {
        priceDisplay = `<span class="price-usd">USD $${product.price.toFixed(2)}</span>`;
        if (blueRate) {
            const priceARS = (product.price * blueRate).toFixed(2);
            priceDisplay += `<span class="price-ars">ARS $${priceARS}</span>`;
        } else {
            priceDisplay += `<span class="price-ars">ARS (cargando...)</span>`;
        }
    } else {
        priceDisplay = '<span class="price-unavailable">Precio no disponible</span>';
    }

    const ratingHTML = product.rating ? generateStars(product.rating) : '';
    const reviewCount = product.reviews ? `(${product.reviews.length})` : '';

    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <div class="product-card-rating">
            ${ratingHTML} <span class="review-count">${reviewCount}</span>
        </div>
        <div class="price">${priceDisplay}</div>
        <p class="stock">Stock: Cargando...</p> 
        <div class="product-card-actions">
            <button class="view-details">Ver Detalles</button>
            <button class="add-to-cart-main" data-id="${product.id}">
                <i class="fas fa-cart-plus"></i>
            </button>
        </div>
    `;

    const addToCartBtn = card.querySelector('.add-to-cart-main');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening modal
            if(card.classList.contains('out-of-stock')) {
                 alert('Este producto está agotado.');
                 return;
            }
            const currentRate = parseFloat(localStorage.getItem('blueRate')) || 1;
            const priceInArs = (product.price * currentRate).toFixed(2);
            addToCart(product.id, product.name, priceInArs, product.image, 1, 'ARS');
        });
    }

    card.addEventListener('click', (e) => {
        if(card.classList.contains('out-of-stock')) {
             e.stopPropagation();
             alert('Este producto está agotado.');
        }
     }, true); 

    return card;
}

function createOfferCard(offer, blueRate) {
     const offerCard = document.createElement('div');
     offerCard.classList.add('offer-card');
     offerCard.dataset.id = offer.id;

     let currentPriceArs = 'cargando...';
     let originalPriceArs = 'cargando...';

     if (blueRate) {
         currentPriceArs = (offer.price * blueRate).toFixed(2);
         originalPriceArs = (offer.originalPrice * blueRate).toFixed(2);
     }

     const ratingHTML = offer.rating ? generateStars(offer.rating) : '';
     const reviewCount = offer.reviews ? `(${offer.reviews.length})` : '';

     offerCard.innerHTML = `
         ${offer.discount ? `<div class="discount-badge">${offer.discount}% OFF</div>` : ''}
         <img src="${offer.image}" alt="${offer.name}" loading="lazy">
         <div class="offer-card-content">
             <h3>${offer.name}</h3>
             <div class="product-card-rating">
                 ${ratingHTML} <span class="review-count">${reviewCount}</span>
             </div>
             <div class="price">
                 <div class="offer-price-current">
                     <span class="price-usd">USD $${offer.price.toFixed(2)}</span>
                     <span class="price-ars">ARS $${currentPriceArs}</span>
                 </div>
                 <div class="offer-price-original">
                     <span class="price-usd-original">USD $${offer.originalPrice.toFixed(2)}</span>
                     <span class="price-ars-original">ARS $${originalPriceArs}</span>
                 </div>
             </div>
             <p class="description">${offer.description || ''}</p>
             <button class="add-to-cart-offer" data-id="${offer.id}">Añadir al Carrito</button>
         </div>
     `;
     return offerCard;
}

export async function updateDollarPrices() {
    const dollarRateContainer = document.getElementById('dollar-rate-container');
    let blueRate = null;

    try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        blueRate = data.venta;

        if (typeof blueRate !== 'number') {
            throw new Error('Invalid rate received from API');
        }

        localStorage.setItem('blueRate', blueRate);
        if (dollarRateContainer) {
            dollarRateContainer.textContent = `Dólar Blue (Venta): $${blueRate.toFixed(2)} ARS`;
        }

    } catch (error) {
        console.error("Error updating dollar prices:", error);
        if (dollarRateContainer) {
            dollarRateContainer.textContent = "Cotización no disponible";
        }
        localStorage.removeItem('blueRate');
    } finally {
        // Re-render products and offers regardless of API success/failure
        const activeCategoryLink = document.querySelector('.categories-menu a.active');
        const category = activeCategoryLink ? activeCategoryLink.getAttribute('data-category') : 'all';
        if (category === 'all') {
             renderProducts();
        } else {
             renderFilteredProducts(category);
        }
        renderExclusiveOffers();
        // After rendering, try to update stock immediately if data is available
        actualizarStockDesdeGoogleSheet();
    }
}

function checkProductStock(productId, quantity) {
    const productCardElement = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (!productCardElement) return false;

    const stockElement = productCardElement.querySelector('.stock');
    if (!stockElement) return false;

    const stockText = stockElement.textContent;
    const currentStock = parseInt(stockText.replace('Stock: ', ''), 10);

    return quantity <= currentStock;
}

function handleProductClick(productId) {
    currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) {
        currentProduct = exclusiveOffers.find(o => o.id === productId);
    }

    const productCardElement = document.querySelector(`.product-card[data-id="${productId}"]`);
    const stockElement = productCardElement ? productCardElement.querySelector('.stock') : null;
    const currentStock = stockElement ? parseInt(stockElement.textContent.replace('Stock: ', ''), 10) : 0;

    if (productCardElement && productCardElement.classList.contains('out-of-stock')) {
         alert('Este producto está agotado.');
         return; 
    }

    if (currentProduct) {
        // Modify quantity input max attribute based on stock
        if (modalQuantityInput) {
            modalQuantityInput.max = currentStock;
            modalQuantityInput.value = Math.min(1, currentStock);
        }
        openProductModal(currentProduct);
    } else {
        console.error(`Product with ID ${productId} not found in products or offers.`);
    }
}

function openProductModal(productData) {
     if (!productData || !modal) return;

     modalImage.src = productData.image;
     modalImage.alt = productData.name;
     modalName.textContent = productData.name;
     modalDescription.textContent = productData.description || 'Descripción no disponible.';

     let priceHtml;
     const blueRate = parseFloat(localStorage.getItem('blueRate')) || null;
     const isOffer = productData.id.startsWith('offer-');
     const basePrice = productData.price; 

     if (basePrice) {
         priceHtml = `<div class="modal-price-container">`;
         priceHtml += `<span class="price-usd">USD $${basePrice.toFixed(2)}</span>`;
         if (blueRate) {
             const priceARS = (basePrice * blueRate).toFixed(2);
             priceHtml += `<span class="price-ars">ARS $${priceARS}</span>`;
         } else {
             priceHtml += `<span class="price-ars">ARS (cargando...)</span>`;
         }

         if (isOffer && productData.originalPrice) {
             priceHtml += `<div class="modal-price-original">`;
             priceHtml += `<span class="price-usd-original">USD $${productData.originalPrice.toFixed(2)}</span>`;
              if (blueRate) {
                 const originalPriceARS = (productData.originalPrice * blueRate).toFixed(2);
                 priceHtml += `<span class="price-ars-original">ARS $${originalPriceARS}</span>`;
             } else {
                priceHtml += `<span class="price-ars-original">ARS (cargando...)</span>`;
             }
             priceHtml += `</div>`; 
         }
          priceHtml += `</div>`; 
     } else {
         priceHtml = '<span class="price-unavailable">Precio no disponible</span>';
     }
     modalPrice.innerHTML = priceHtml; 


     if (modalRatingContainer) {
        if (productData.rating) {
             modalRatingContainer.innerHTML = generateStars(productData.rating);
             modalRatingContainer.style.display = 'block';
        } else {
             modalRatingContainer.style.display = 'none';
        }
     }

     if (modalReviewsContainer) {
         modalReviewsContainer.innerHTML = ''; 
         if (productData.reviews && productData.reviews.length > 0) {
             const reviewsTitle = document.createElement('h4');
             reviewsTitle.textContent = 'Reseñas de Clientes';
             modalReviewsContainer.appendChild(reviewsTitle);
             productData.reviews.forEach(review => {
                 const reviewElement = document.createElement('div');
                 reviewElement.classList.add('review-item');
                 reviewElement.innerHTML = `
                     <div class="review-rating">${generateStars(review.rating || productData.rating)}</div>
                     <p class="review-text">"${review.text}"</p>
                     <p class="review-author">- ${review.author || 'Anónimo'}</p>
                 `;
                 modalReviewsContainer.appendChild(reviewElement);
             });
             modalReviewsContainer.style.display = 'block';
         } else {
             modalReviewsContainer.style.display = 'none';
         }
     }

     modalQuantityInput.value = 1;

     modal.classList.add('active');
     modalOverlay.classList.add('active');
     document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
    currentProduct = null;
    document.body.style.overflow = '';
}

function decrementQuantity() {
    let currentValue = parseInt(modalQuantityInput.value, 10);
    if (currentValue > 1) {
        modalQuantityInput.value = currentValue - 1;
    }
}

function incrementQuantity() {
    let currentValue = parseInt(modalQuantityInput.value, 10);
    modalQuantityInput.value = currentValue + 1;
}

function handleAddToCartFromModal() {
    if (!currentProduct) return;

    const quantity = parseInt(modalQuantityInput.value, 10);
    
    if (quantity <= 0) {
        alert("Seleccione una cantidad válida (mínimo 1).");
        return;
    }

    const blueRate = parseFloat(localStorage.getItem('blueRate'));
    if (!blueRate) {
        alert("La cotización del dólar no está disponible. No se puede agregar al carrito.");
        return;
    }

    // Check if requested quantity is available in stock
    if (!checkProductStock(currentProduct.id, quantity)) {
        alert(`Lo sentimos, solo hay ${modalQuantityInput.max} unidades disponibles en stock.`);
        return;
    }

    const priceInArs = parseFloat((currentProduct.price * blueRate).toFixed(2));

    addToCart(currentProduct.id, currentProduct.name, priceInArs, currentProduct.image, quantity, 'ARS');
    closeModal();
}

function addToCart(productId, productName, productPriceARS, productImage, quantity = 1, currency = 'ARS') {
    // First, check if requested quantity is available in stock
    if (!checkProductStock(productId, quantity)) {
        const stockElement = document.querySelector(`.product-card[data-id="${productId}"] .stock`);
        const currentStock = stockElement ? parseInt(stockElement.textContent.replace('Stock: ', ''), 10) : 0;
        alert(`Lo sentimos, solo hay ${currentStock} unidades disponibles en stock.`);
        return;
    }

    const price = typeof productPriceARS === 'string' ? parseFloat(productPriceARS) : productPriceARS;
    if (isNaN(price)) {
        console.error(`Invalid ARS price for product ${productId}: ${productPriceARS}`);
        alert("No se pudo agregar el producto debido a un precio inválido.");
        return;
    }

    const existingCartItemIndex = cart.findIndex(item => item.id === productId);

    if (existingCartItemIndex > -1) {
        const totalQuantity = cart[existingCartItemIndex].quantity + quantity;
        // Check total quantity against stock
        if (!checkProductStock(productId, totalQuantity)) {
            const stockElement = document.querySelector(`.product-card[data-id="${productId}"] .stock`);
            const currentStock = stockElement ? parseInt(stockElement.textContent.replace('Stock: ', ''), 10) : 0;
            alert(`Lo sentimos, solo hay ${currentStock} unidades disponibles en stock.`);
            return;
        }
        cart[existingCartItemIndex].quantity = totalQuantity;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price, 
            image: productImage,
            quantity: quantity,
            currency: currency 
        });
    }

    console.log(`${quantity} x ${productName} agregado(s) al carrito.`);
    saveCartToLocalStorage();
    updateCartUI();
    animateCartIcon();
    showCartTemporarily();
}

function animateCartIcon() {
    const cartIconElement = document.querySelector('.cart a i');
    const cartCountElement = document.getElementById('cart-count');
    if (cartIconElement) {
        gsap.timeline()
            .to(cartIconElement, { scale: 1.3, duration: 0.15, ease: "power1.out" })
            .to(cartIconElement, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" });
    }
    if (cartCountElement && cartCountElement.style.display !== 'none') {
        gsap.timeline()
            .to(cartCountElement, { scale: 1.4, duration: 0.15, ease: "power1.out" })
            .to(cartCountElement, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" }, "-=0.1");
    }
}

function updateCartUI() {
    if (!cartContainer) return;
    cartContainer.innerHTML = "";

    if (cart.length === 0) {
        cartContainer.innerHTML = "<p>El carrito está vacío.</p>";
        updateCartIconCount();
         cartContainer.style.display = 'none';
        return;
    }

    let total = 0;
    let cartCurrency = 'ARS'; 

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const productItem = document.createElement("div");
        productItem.classList.add('cart-item');
        productItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                 <span class="cart-item-name">${item.name} (x${item.quantity})</span>
                 <span class="cart-item-price">$${itemTotal.toFixed(2)} ${item.currency}</span>
            </div>
            <button class="remove-from-cart" data-id="${item.id}" aria-label="Eliminar ${item.name} del carrito">&times;</button>
        `;

        productItem.querySelector('.remove-from-cart').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromCart(item.id);
        });
        cartContainer.appendChild(productItem);
    });

    const totalElement = document.createElement("div");
    totalElement.classList.add('cart-total');
    totalElement.textContent = `Total: $${total.toFixed(2)} ${cartCurrency}`;
    cartContainer.appendChild(totalElement);

    processPaymentButton.textContent = 'Procesar Pago';
    processPaymentButton.classList.add('process-payment-button');
    processPaymentButton.removeEventListener('click', triggerPaymentModal); 
    processPaymentButton.addEventListener('click', triggerPaymentModal);
    cartContainer.appendChild(processPaymentButton);

    updateCartIconCount();
     if (document.querySelector('.cart:hover') || cartContainer.matches(':hover')) {
         cartContainer.style.display = 'block';
     }
}

function triggerPaymentModal() {
     if (cart.length > 0) {
         openPaymentModal(cart);
     } else {
         alert("El carrito está vacío.");
     }
}

function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        const removedItem = cart.splice(itemIndex, 1)[0];
        console.log(`Producto "${removedItem.name}" eliminado del carrito.`);
        saveCartToLocalStorage();
        updateCartUI();

         if (cart.length === 0) {
             cartContainer.style.display = 'none';
         } else {
              if (!document.querySelector('.cart:hover') && !cartContainer.matches(':hover')) {
                  cartContainer.style.display = 'none';
              } else {
                   cartContainer.style.display = 'block';
              }
         }

    } else {
        console.log(`Intento de eliminar producto con ID ${productId} no encontrado.`);
    }
}

function showCartTemporarily() {
    if (cartContainer && cart.length > 0) {
        cartContainer.style.display = 'block';
        setTimeout(() => {
            if (!document.querySelector('.cart:hover') && !cartContainer.matches(':hover')) {
                cartContainer.style.display = 'none';
            }
        }, 3000);
    }
}

function updateCartIconCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('shoppingCart');
    cart = storedCart ? JSON.parse(storedCart) : [];
    updateCartUI();
}

function saveCartToLocalStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

document.addEventListener('DOMContentLoaded', () => {
    loadCartFromLocalStorage();
    initializeAnimations();
    renderProducts(); // Render initially without ARS prices
    renderExclusiveOffers(); // Render initially without ARS prices
    initializeModalListeners();
    initializeCartListeners();
    initializeCategoryFilters(); 
    initializePaymentModal();
    updateDollarPrices(); // Fetch rate and re-render with ARS
    setInterval(updateDollarPrices, 3600000);

    // Fetch stock data after initial rendering and dollar price update
    actualizarStockDesdeGoogleSheet();
    // Execute stock update every 5 minutes
    setInterval(actualizarStockDesdeGoogleSheet, 300000); // 300000ms = 5 minutes


    // Add header hide/show on scroll
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScroll > lastScrollTop && currentScroll > 200) {
            // Scrolling down - hide header
            document.querySelector('header').classList.add('header-scroll-hidden');
        } else {
            // Scrolling up - show header
            document.querySelector('header').classList.remove('header-scroll-hidden');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });

    // Add floating hints on hover for products
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, { y: -5, boxShadow: '0 8px 20px rgba(255, 193, 7, 0.15)', duration: 0.3 });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.3 });
        });
    });
});

window.clearCartAndUI = () => {
    console.log("Clearing cart and updating UI...");
    cart = [];
    saveCartToLocalStorage();
    updateCartUI();
};