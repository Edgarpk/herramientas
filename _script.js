import { gsap } from "gsap";
import { products } from "./config.js";

// --- State Variables ---
let cart = []; // This will be loaded from localStorage
let currentProduct = null; // To keep track of the product in the modal

// --- DOM Elements ---
const productGrid = document.querySelector('.product-grid');
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
const cartIcon = document.querySelector('.cart a'); // Get the cart icon link
const processPaymentButton = document.createElement('button'); // Create button dynamically

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load cart from localStorage
    loadCartFromLocalStorage();

    // GSAP Animations (Keep existing animations)
    gsap.from('header', { opacity: 0, duration: 1, y: -50 });
    gsap.from('.hero-content', { opacity: 0, duration: 1, delay: 0.5, y: 50 });
    gsap.from('.featured-products', { opacity: 0, duration: 1, delay: 1, y: 50 });
    gsap.from('footer', { opacity: 0, duration: 1, delay: 1.5, y: 50 });

    // Render Products (Keep existing rendering logic)
    if (productGrid) {
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.dataset.id = product.id;

            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button class="view-details">Ver Detalles</button>
            `;
            productCard.addEventListener('click', () => openModal(product.id));
            productGrid.appendChild(productCard);
        });
    } else {
        console.error("Product grid not found");
    } // Stock will be updated after rendering in actualizarStockDesdeGoogleSheet

    // Modal Event Listeners (Keep existing listeners)
    if (modal) {
        closeModalButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', closeModal);
        quantityDecrementButton.addEventListener('click', decrementQuantity);
        quantityIncrementButton.addEventListener('click', incrementQuantity);
        modalAddToCartButton.addEventListener('click', handleAddToCartFromModal);
    }

    // Cart Icon Hover Listener (Keep existing listeners)
    const cartDiv = document.querySelector('.cart');
    if (cartDiv && cartContainer) {
        cartDiv.addEventListener('mouseenter', () => {
            if (cart.length > 0) {
                 cartContainer.style.display = 'block';
            }
        });
        cartDiv.addEventListener('mouseleave', () => {
            // Check if the modal is active before hiding the cart
            if (!modal || !modal.classList.contains('active')) {
                 // Also check if the mouse is still over the cart container itself
                 if (!cartContainer.matches(':hover')) {
                    cartContainer.style.display = 'none';
                 }
            }
        });
        // Add mouseleave to the container itself to hide it
        cartContainer.addEventListener('mouseleave', () => {
             cartContainer.style.display = 'none';
        });
    }

    // Initial Cart UI Update (already done by loadCartFromLocalStorage)
    // updateCartUI(); // No longer needed here as loadCartFromLocalStorage calls it
});


// --- Modal Functions (Keep existing functions) ---

function openModal(productId) {
    currentProduct = products.find(p => p.id === productId);
    if (!currentProduct || !modal) return;

    modalImage.src = currentProduct.image;
    modalImage.alt = currentProduct.name;
    modalName.textContent = currentProduct.name;
    modalDescription.textContent = currentProduct.description || 'Descripción no disponible.';
    modalPrice.textContent = `Precio: $${currentProduct.price.toFixed(2)}`;
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
    if (quantity > 0) {
        // Find product details again just in case (though currentProduct should be set)
        const productToAdd = products.find(p => p.id === currentProduct.id);
        if(productToAdd) {
            addToCart(productToAdd.id, productToAdd.name, productToAdd.price, productToAdd.image, quantity);
        }
        closeModal();
    } else {
        alert("Seleccione una cantidad válida.");
    }
}


// --- Cart Functions (Integrate localStorage) ---

function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('shoppingCart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
    } else {
        cart = []; // Initialize empty if nothing in storage
    }
    updateCartUI(); // Update UI after loading
}

function saveCartToLocalStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

// Modified addToCart to include image and save to localStorage
function addToCart(productId, productName, productPrice, productImage, quantity = 1) {
    const existingCartItemIndex = cart.findIndex(item => item.id === productId);

    if (existingCartItemIndex > -1) {
        // Product already in cart, update quantity
        cart[existingCartItemIndex].quantity += quantity;
    } else {
        // Product not in cart, add new item (including image)
        const product = {
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage, // Add image here
            quantity: quantity,
        };
        cart.push(product);
    }

    console.log(`${quantity} x ${productName} agregado(s) al carrito.`);
    saveCartToLocalStorage(); // Save updated cart
    updateCartUI();
    animateCartIcon();
    showCartTemporarily();
}


// Modified updateCartUI to potentially include images later if desired
function updateCartUI() {
    if (!cartContainer) return;

    cartContainer.innerHTML = ""; // Clear previous content

    if (cart.length === 0) {
        cartContainer.innerHTML = "<p>El carrito está vacío.</p>";
        cartContainer.style.display = 'none'; 
        updateCartIconCount(); // Update count even when empty
        return;
    }

    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const productItem = document.createElement("div");
        productItem.classList.add('cart-item'); 
        // Example including image (optional, uncomment if desired)
        // productItem.innerHTML = `
        //     <img src="${item.image}" alt="${item.name}" style="width: 30px; height: 30px; object-fit: cover; margin-right: 5px;"> 
        //     <span class="cart-item-name">${item.name} (x${item.quantity})</span>
        //     <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
        //     <button class="remove-from-cart" data-id="${item.id}">&times;</button> 
        // `;
         productItem.innerHTML = `
            <span class="cart-item-name">${item.name} (x${item.quantity})</span>
            <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
            <button class="remove-from-cart" data-id="${item.id}">&times;</button>
        `;

        productItem.querySelector('.remove-from-cart').addEventListener('click', (e) => {
            e.stopPropagation(); 
            removeFromCart(item.id);
        });
        cartContainer.appendChild(productItem);
    });

    const totalElement = document.createElement("div");
    totalElement.classList.add('cart-total'); 
    totalElement.textContent = `Total: $${total.toFixed(2)}`;
    cartContainer.appendChild(totalElement);
    
    // Add "Process Payment" button
    processPaymentButton.textContent = 'Procesar Pago';
    processPaymentButton.classList.add('process-payment-button'); // Add class for styling
    processPaymentButton.addEventListener('click', handleProcessPayment);
    cartContainer.appendChild(processPaymentButton);

    updateCartIconCount(); // Update icon count

    // Don't automatically show on update unless explicitly told (e.g., showCartTemporarily)
}

function handleProcessPayment() {
    // In a real application, this is where you would integrate with a payment gateway.
    // For this example, we'll just show an alert.
    alert("Procesando pago... (funcionalidad no implementada en este ejemplo)");
    console.log("Payment processing initiated (not actually processing payment).");
    // Optionally, you could clear the cart after "payment" in this demo:
    // clearCart();
}

// Modified removeFromCart to save to localStorage
function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        console.log(`Producto con ID ${productId} (${cart[itemIndex].name}) eliminado del carrito.`);
        cart.splice(itemIndex, 1); // Remove item by index
        saveCartToLocalStorage(); // Save updated cart
        updateCartUI();
         // Keep cart visible if items remain after removal AND mouse is over it
         if (cart.length > 0 && document.querySelector('.cart:hover')) {
             cartContainer.style.display = 'block';
         } else if (cart.length === 0) {
             cartContainer.style.display = 'none'; // Hide if now empty
         }
    } else {
         console.log(`Intento de eliminar producto con ID ${productId} no encontrado.`);
    }
}

// --- UI Enhancement Functions (Keep existing functions) ---

function animateCartIcon() {
    if (cartIcon) {
        gsap.to(cartIcon, { 
            scale: 1.3, 
            duration: 0.2, 
            yoyo: true, 
            repeat: 1,
            ease: "power1.inOut"
        });
    }
}

function showCartTemporarily() {
     if (cartContainer && cart.length > 0) {
        cartContainer.style.display = 'block';
        setTimeout(() => {
             if (!document.querySelector('.cart:hover') && !cartContainer.matches(':hover')) { // Check both icon and dropdown hover
                cartContainer.style.display = 'none';
            }
        }, 3000); 
    }
}

// New function to update cart count indicator (optional but good UX)
function updateCartIconCount() {
    const cartCountElement = document.getElementById('cart-count'); // Need to add this element in HTML
    if (cartCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none'; // Show only if count > 0
    }
}