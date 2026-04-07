
import axios from 'axios';
import "dotenv/config";

const payload = {
    "return_url": "https://example.com/payment/",
    "website_url": "https://example.com/",
    "amount": 1000,
    "purchase_order_id": "99999",
    "purchase_order_name": "Booking #99999",
    "customer_info": {
        "name": "Test User",
        "email": "test@example.com",
        "phone": "9800000000"
    },
    "product_details": [
        {
            "identity": "99999",
            "name": "Booking #99999",
            "total_price": 1000,
            "quantity": 1,
            "unit_price": 1000
        }
    ]
};

console.log("Testing Khalti Payment Initiation...");
console.log("Key available:", !!process.env.KHALTI_SECRET_KEY);
console.log("Key start:", process.env.KHALTI_SECRET_KEY?.substring(0, 4));

async function testPayment() {
    try {
        const response = await axios.post('https://dev.khalti.com/api/v2/epayment/initiate/', payload, {
            headers: {
                'Authorization': `key ${process.env.KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            }
        });
        console.log("Success:", response.data);
    } catch (error: any) {
        console.error("Error:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error("Message:", error.message);
        }
    }
}

testPayment();
