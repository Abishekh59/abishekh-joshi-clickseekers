import { Router } from "express";
import {
    forgotPassword,
    getKycStatus,
    getMe,
    getProfileImage,
    login,
    register,
    resendOTP,
    resetPassword,
    submitKycForm,
    submitReport,
    updatePhotographerProfile,
    updateProfile,
    uploadAvatar,
    uploadKycDocuments,
    verifyOTP,
    verifyPasswordResetOTP,
} from "../controllers/userController";
import { authenticate, requireRole } from "../middleware/auth";
import { uploadKycDocs, uploadProfileImage } from "../middleware/upload";

const router = Router();

// Public routes (no authentication required)
router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-password-reset-otp", verifyPasswordResetOTP);
router.post("/reset-password", resetPassword);
router.get("/profile-image/:userId", getProfileImage);

// Protected routes (authentication required)
router.put("/profile", authenticate, updateProfile);
router.put(
  "/profile-image",
  authenticate,
  uploadProfileImage.single("image"),
  uploadAvatar,
);
router.put(
  "/photographer-profile",
  authenticate,
  requireRole("PHOTOGRAPHER"),
  updatePhotographerProfile,
);
router.post("/kyc/submit", authenticate, submitKycForm);
router.post(
  "/kyc/upload",
  authenticate,
  uploadKycDocs.single("image"),
  uploadKycDocuments,
);
router.get("/kyc/status", authenticate, getKycStatus);
router.get("/me", authenticate, getMe);
router.post("/report", authenticate, submitReport);

// Admin routes
// Admin stats moved to adminRoutes.ts
// review-kyc moved to adminRoutes.ts

export default router;
