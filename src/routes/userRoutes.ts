import { Router } from 'express';
import {
  forgotPassword,
  getKycStatus,
  getMe,
  login,
  register,
  resendOTP,
  resetPassword,
  reviewKyc,
  submitKycForm,
  updatePhotographerProfile,
  updateProfile,
  uploadAvatar,
  uploadKycDocuments,
  verifyOTP,
  verifyPasswordResetOTP
} from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadKycDocs, uploadProfileImage } from '../middleware/upload';

const router = Router();

// Public routes (no authentication required)
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-password-reset-otp', verifyPasswordResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes (authentication required)
router.put('/profile', authenticate, updateProfile);
router.put('/profile-image', authenticate, uploadProfileImage.single('image'), uploadAvatar);
router.put('/photographer-profile', authenticate, requireRole('PHOTOGRAPHER'), updatePhotographerProfile);
router.post('/kyc/submit', authenticate, submitKycForm);
router.post('/kyc/upload', authenticate, uploadKycDocs.single('image'), uploadKycDocuments);
router.get('/kyc/status', authenticate, getKycStatus);
router.get('/me', authenticate, getMe);

// Admin routes
router.post('/kyc/review', authenticate, requireRole('ADMIN'), reviewKyc);

export default router;
