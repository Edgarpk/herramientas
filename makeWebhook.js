export async function sendOrderToWebhook(orderData) {
    const webhookUrl = 'https://hook.us2.make.com/90je3dxo4wddoesexinw1v4kojorv7ya';

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`Webhook response not OK: ${response.status}`);
        }

        const responseData = await response.text();
        console.log('Order sent to webhook successfully:', responseData);
        return true;
    } catch (error) {
        console.error('Error sending order to webhook:', error);
        return false;
    }
}