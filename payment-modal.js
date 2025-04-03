import { sendOrderToWebhook } from './makeWebhook.js';
// Note: Cart state is managed in script.js for now.
// We'll need access to it here, passed via arguments or imported if refactored further.

// --- DOM Elements (Specific to Payment Modal) ---
const paymentModal = document.getElementById('payment-modal');
const paymentModalOverlay = document.getElementById('payment-modal-overlay');
const closePaymentModalButton = document.getElementById('close-payment-modal');
const completePaymentButton = document.getElementById('complete-payment');
const cancelPaymentButton = document.getElementById('cancel-payment');
const paymentSubtotalElem = document.getElementById('payment-subtotal'); // Renamed variable
const paymentTaxElem = document.getElementById('payment-tax');           // Renamed variable
const paymentTotalElem = document.getElementById('payment-total');         // Renamed variable
const orderNumberDisplay = document.getElementById('order-number-display');
const paymentCustomerForm = document.getElementById('payment-customer-form'); // Form element
const shippingTypeRadios = document.querySelectorAll('input[name="shipping-type"]');
const deliveryAddressForm = document.getElementById('delivery-address-form');

// --- State ---
let currentCartData = []; // To hold cart data when modal opens
let currentTotal = 0;

// --- Utility Functions ---

function generateOrderNumber() {
    const timestamp = Date.now().toString(36);
    const randomChars = Math.random().toString(36).substring(2, 7);
    return `ORD-${timestamp}-${randomChars}`.toUpperCase();
}

function validatePaymentForm() {
    const name = document.getElementById('payment-name').value.trim();
    const dni = document.getElementById('payment-dni').value.trim();
    const email = document.getElementById('payment-email').value.trim();
    const phone = document.getElementById('payment-phone').value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const dniRegex = /^[0-9]{7,8}$/; // DNI (Argentina)
    const phoneRegex = /^[0-9]{10,}$/; // Allow 10 or more digits for phone

    let isValid = true;
    // Basic checks, could be enhanced with visual feedback
    if (name === '') {
        alert('Por favor, ingrese su nombre completo.');
        isValid = false;
    } else if (!dniRegex.test(dni)) {
        alert('Por favor, ingrese un DNI válido (7-8 dígitos sin puntos).');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        alert('Por favor, ingrese un email válido.');
        isValid = false;
    } else if (!phoneRegex.test(phone)) {
        alert('Por favor, ingrese un número de teléfono válido (al menos 10 dígitos, solo números).');
        isValid = false;
    }

    // Validate shipping address if delivery is selected
    const shippingType = document.querySelector('input[name="shipping-type"]:checked').value;
    if (shippingType === 'delivery') {
        const address = document.getElementById('delivery-address').value.trim();
        const postalCode = document.getElementById('postal-code').value.trim();
        if (!address) {
             alert('Por favor, ingrese la dirección de envío.');
             isValid = false;
        }
         if (!postalCode) { // Basic check for postal code
             alert('Por favor, ingrese el código postal.');
             isValid = false;
         }
    }


    return isValid;
}

// --- Function to create professional receipt HTML ---
function createReceiptHTML(paymentData) {
    const itemsHTML = paymentData.productos.map(item => `
        <tr>
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td>$${(typeof item.precioUnitario === 'number' ? item.precioUnitario.toFixed(2) : 'N/A')}</td>
            <td>$${(typeof item.precioTotal === 'number' ? item.precioTotal.toFixed(2) : 'N/A')}</td>
        </tr>
    `).join('');

    // Calculate subtotal and tax from items if not directly available
    const subtotal = paymentData.productos.reduce((sum, item) => sum + (item.precioTotal || 0), 0);
    const taxAmount = paymentData.total && subtotal ? parseFloat(paymentData.total.replace(/[^\d.-]/g, '')) - subtotal : 0; // Estimate tax if total is available

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Recibo Construmec - Orden ${paymentData.transaccionID}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 800px; margin: 20px auto; background-color: #fff; padding: 30px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #ffc107; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; color: #333; font-size: 1.8em; }
                .header p { margin: 5px 0 0; color: #555; font-size: 0.9em; }
                h2 { color: #ffc107; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px; font-size: 1.3em; }
                .section { margin-bottom: 20px; }
                .section p { margin: 6px 0; color: #444; line-height: 1.6; }
                .section strong { color: #000; min-width: 120px; display: inline-block; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.95em; }
                .items-table th { background-color: #f8f8f8; color: #333; font-weight: 600; }
                .items-table td:nth-child(2), .items-table td:nth-child(3), .items-table td:nth-child(4) { text-align: right; }
                .totals { margin-top: 25px; padding-top: 15px; border-top: 2px solid #ffc107; text-align: right; }
                .totals p { margin: 8px 0; font-size: 1.1em; }
                .totals strong { font-weight: bold; color: #000; }
                .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #777; }
                .button-container { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                button { padding: 10px 20px; margin: 0 10px; cursor: pointer; background-color: #ffc107; color: #333; border: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s ease; }
                button:hover { background-color: #e0a800; }
                button.secondary { background-color: #6c757d; color: white; }
                button.secondary:hover { background-color: #5a6268; }
                 @media print {
                    body { background-color: #fff; margin: 0; padding: 0; }
                    .container { box-shadow: none; border: none; margin: 0; max-width: 100%; padding: 15px; }
                    .button-container { display: none; }
                    h2 { color: #333; } /* Print black headings */
                    .header { border-bottom: 2px solid #ccc; }
                    .totals { border-top: 2px solid #ccc; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Construmec Santo Tomé</h1>
                    <p>Recibo de Compra</p>
                </div>

                <div class="section">
                    <h2>Detalles del Pedido</h2>
                    <p><strong>Número de Orden:</strong> ${paymentData.transaccionID}</p>
                    <p><strong>Fecha:</strong> ${paymentData.fecha}</p>
                    <p><strong>Método de Pago:</strong> ${paymentData.metodoPago}</p>
                </div>

                <div class="section">
                    <h2>Información del Cliente</h2>
                    <p><strong>Nombre:</strong> ${paymentData.nombre}</p>
                    <p><strong>DNI:</strong> ${paymentData.dni}</p>
                    <p><strong>Email:</strong> ${paymentData.email}</p>
                    <p><strong>Teléfono:</strong> ${paymentData.phone}</p>
                </div>

                <div class="section">
                    <h2>Información de Envío</h2>
                    <p><strong>Método:</strong> ${paymentData.envio.type === 'delivery' ? 'Envío por Encomienda' : 'Retiro en Local'}</p>
                    ${paymentData.envio.type === 'delivery' ? `
                        <p><strong>Dirección:</strong> ${paymentData.envio.address || 'No especificada'}</p>
                        <p><strong>Código Postal:</strong> ${paymentData.envio.postalCode || 'No especificado'}</p>
                    ` : ''}
                </div>

                <div class="section">
                    <h2>Productos Comprados</h2>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Precio Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                    </table>
                </div>

                <div class="totals">
                     <p>Subtotal: <span>$${subtotal.toFixed(2)} ${paymentData.moneda}</span></p>
                     <p>IVA (21% aprox.): <span>$${taxAmount.toFixed(2)} ${paymentData.moneda}</span></p>
                    <p><strong>Total Pagado:</strong> <strong>${paymentData.total} ${paymentData.moneda}</strong></p>
                </div>

                <div class="footer">
                    <p>¡Gracias por su compra!</p>
                    <p>Construmec Santo Tomé - Siempre a su servicio.</p>
                </div>

                <div class="button-container">
                    <button id="print-receipt">Imprimir Recibo</button>
                    <button id="download-receipt" class="secondary">Descargar HTML</button>
                </div>
            </div>

            <script>
                // Print Functionality
                document.getElementById('print-receipt').addEventListener('click', () => {
                    window.print();
                });

                // Download Functionality
                document.getElementById('download-receipt').addEventListener('click', () => {
                    // Use the outerHTML of the current document (the receipt itself)
                    const receiptHtml = document.documentElement.outerHTML;
                    const blob = new Blob([receiptHtml], { type: 'text/html' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'Recibo_Construmec_${paymentData.transaccionID}.html'; // Set the filename
                    document.body.appendChild(link); // Append to body to ensure click works in all browsers
                    link.click();
                    document.body.removeChild(link); // Clean up the link
                    URL.revokeObjectURL(link.href); // Free up memory
                });
            </script>
        </body>
        </html>
    `;
}


// --- Event Handlers ---

function handleShippingChange() {
    const selectedValue = document.querySelector('input[name="shipping-type"]:checked').value;
    if (selectedValue === 'delivery') {
        deliveryAddressForm.classList.remove('hidden');
        deliveryAddressForm.classList.add('visible'); // Use class for animation
    } else {
        deliveryAddressForm.classList.add('hidden');
        deliveryAddressForm.classList.remove('visible');
    }
}

async function handleCompletePayment() {
    if (validatePaymentForm()) {
        const orderNumber = orderNumberDisplay.textContent.replace('Número de Orden: ', ''); // Get order number
        const shippingType = document.querySelector('input[name="shipping-type"]:checked').value;
        let shippingDetails = { type: shippingType };

        if (shippingType === 'delivery') {
            shippingDetails.address = document.getElementById('delivery-address').value.trim();
            shippingDetails.postalCode = document.getElementById('postal-code').value.trim();
        }

        // Construct payment data
        const datosPago = {
            transaccionID: orderNumber,
            nombre: document.getElementById('payment-name').value,
            dni: document.getElementById('payment-dni').value,
            email: document.getElementById('payment-email').value,
            phone: document.getElementById('payment-phone').value,
            total: paymentTotalElem.textContent.replace('Total a pagar: ', '').trim(), // Get total from display, ensure it's just the value + currency
            moneda: "ARS", // Assuming ARS for now
            metodoPago: "Transferencia/QR",
            fecha: new Date().toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }),
            productos: currentCartData.map(item => ({ // Use stored cart data
                id: item.id,
                nombre: item.name,
                cantidad: item.quantity,
                // Ensure prices are numbers if they were strings
                precioUnitario: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                precioTotal: (typeof item.price === 'string' ? parseFloat(item.price) : item.price) * item.quantity
            })),
            envio: shippingDetails
        };

        console.log("Datos de pago a enviar:", datosPago);


        // --- Send to Webhook ---
        completePaymentButton.disabled = true; // Disable button during processing
        completePaymentButton.textContent = 'Procesando...';

        const webhookSent = await sendOrderToWebhook(datosPago);

        if (!webhookSent) {
            alert('Hubo un problema al procesar su orden. Por favor, inténtelo de nuevo más tarde o contacte con soporte.');
            completePaymentButton.disabled = false;
            completePaymentButton.textContent = 'Confirmar Pago y Orden';
            return; // Stop processing
        }

        // --- Generate Receipt ---
        const reciboHTML = createReceiptHTML(datosPago); // Use the new function
        const ventanaRecibo = window.open("", "_blank", "width=850,height=700,scrollbars=yes,resizable=yes"); // Adjusted size
        if (ventanaRecibo) {
             ventanaRecibo.document.open();
             ventanaRecibo.document.write(reciboHTML);
             ventanaRecibo.document.close(); // Necessary for scripts to run in some browsers
        } else {
            alert("No se pudo abrir la ventana de recibo. Por favor, deshabilite el bloqueo de pop-ups.");
        }


        // --- Clear Cart & Close Modal ---
        // Notify the main script to clear the cart
        if (typeof window.clearCartAndUI === 'function') {
            window.clearCartAndUI();
        } else {
            console.warn("clearCartAndUI function not found in global scope. Cart not cleared automatically.");
             localStorage.removeItem('shoppingCart');
             // Optionally force reload if state management is simple
             // window.location.reload();
        }

        closePaymentModal(); // Close the payment modal

        // Reset button state (though modal is closing)
        completePaymentButton.disabled = false;
        completePaymentButton.textContent = 'Confirmar Pago y Orden';

    }
}

// --- Modal Control Functions ---

export function openPaymentModal(cartItems) { // Accept cart data as argument
    if (!paymentModal || !paymentModalOverlay) {
        console.error("Payment modal elements not found.");
        return;
    }

    // Store cart data and calculate totals
    currentCartData = cartItems; // Store the passed cart data
    const subtotal = currentCartData.reduce((sum, item) => {
        // Ensure price is a number before calculation
        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return sum + (price * item.quantity);
    }, 0);

    const taxRate = 0.21; // Example tax rate (21%)
    const taxAmount = subtotal * taxRate;
    currentTotal = subtotal + taxAmount; // Store total

    // Update modal display
    paymentSubtotalElem.textContent = `$${subtotal.toFixed(2)}`;
    paymentTaxElem.textContent = `$${taxAmount.toFixed(2)}`;
    paymentTotalElem.textContent = `$${currentTotal.toFixed(2)}`; // Only the value
    orderNumberDisplay.textContent = `Número de Orden: ${generateOrderNumber()}`; // Generate new number each time

    // Reset form fields
    paymentCustomerForm.reset();
    // Reset shipping selection and hide address form
    document.getElementById('shipping-local-pickup').checked = true; // Default to pickup
    handleShippingChange(); // Ensure address form is hidden initially

    // Show modal
    paymentModal.classList.add('active');
    paymentModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

export function closePaymentModal() {
    if (!paymentModal || !paymentModalOverlay) return;

    paymentModal.classList.remove('active');
    paymentModalOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore background scrolling
    currentCartData = []; // Clear stored cart data
    currentTotal = 0;
}

// --- Initialization ---

export function initializePaymentModal() {
    if (!paymentModal) {
        console.log("Payment modal not found on this page.");
        return; // Don't attach listeners if modal doesn't exist
    }
    console.log("Initializing Payment Modal listeners...");
    closePaymentModalButton.addEventListener('click', closePaymentModal);
    paymentModalOverlay.addEventListener('click', closePaymentModal);
    completePaymentButton.addEventListener('click', handleCompletePayment);
    cancelPaymentButton.addEventListener('click', closePaymentModal);

    // Add listeners for shipping radio buttons
    shippingTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleShippingChange);
    });

    // Initial setup for shipping form visibility based on default check
    handleShippingChange();
}