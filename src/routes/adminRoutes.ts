
import express from 'express';
import {
    getAdminStats,
    getAllBookings,
    getAllReports,
    getAllUsers,
    getPendingKyc,
    reviewKyc,
    updateReportStatus,
    updateUserStatus
} from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// All routes here require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// Dashboard Stats
router.get('/stats', getAdminStats);

// User Management
router.get('/users', getAllUsers);
router.patch('/users/:userId/status', updateUserStatus);

// Booking Management
router.get('/bookings', getAllBookings);

// KYC Verification
router.get('/kyc/pending', getPendingKyc);
router.post('/kyc/review', reviewKyc);

// Reports Management
router.get('/reports', getAllReports);
router.patch('/reports/:reportId/status', updateReportStatus);

export default router;
