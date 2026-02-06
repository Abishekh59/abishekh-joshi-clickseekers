import express from 'express';
import { createBooking, getMyBookings, updateBookingStatus } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Book a photographer
router.post('/create', authenticate, createBooking);

// Get all bookings for logged-in user
router.get('/my', authenticate, getMyBookings);

// Update booking status
router.patch('/status', authenticate, updateBookingStatus);

export default router;
