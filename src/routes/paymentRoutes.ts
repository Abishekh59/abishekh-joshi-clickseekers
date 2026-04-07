
import express from 'express';
import { getPaymentDetails, initiatePayment, verifyPayment } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Initiate Khalti payment
router.post('/initiate', authenticate, initiatePayment);

// Verify Khalti payment
router.post('/verify', authenticate, verifyPayment);

// Get payment details for a booking
router.get('/details/:bookingId', authenticate, getPaymentDetails);

export default router;
