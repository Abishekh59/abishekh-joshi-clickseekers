import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../model/index";
import * as pointsService from "../services/pointsService";
import catchAsync from "../utils/catchAsync";
import { sendOTPEmail, sendPasswordResetOTPEmail } from "../utils/emailService";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const OTP_EXPIRY_MINUTES = 10;

// Add this helper near the top (after constants is fine)
const withCors = (req: Request, res: Response): boolean => {
  // NOTE: Prefer configuring CORS globally in app.ts, but this unblocks auth quickly.
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // If your frontend sends credentials (cookies), do NOT use "*" above. Set CORS_ORIGIN instead.
  // res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === "OPTIONS") {
    res.status(204).send();
    return true;
  }
  return false;
};

const parseDateOrNull = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeProfileImageInput = (
  profileImage: unknown,
): string | null | undefined => {
  if (profileImage === undefined) return undefined;
  if (profileImage === null) return null;

  if (typeof profileImage === "string") {
    return profileImage;
  }

  if (typeof profileImage === "object") {
    const value = profileImage as Record<string, unknown>;
    const mimeType =
      typeof value.mime_type === "string" ? value.mime_type : "image/jpeg";
    const base64Raw =
      typeof value.data === "string"
        ? value.data
        : typeof value.base64 === "string"
          ? value.base64
          : null;

    if (base64Raw && base64Raw.trim() !== "") {
      if (base64Raw.startsWith("data:")) {
        return base64Raw;
      }
      return `data:${mimeType};base64,${base64Raw}`;
    }

    return JSON.stringify(value);
  }

  return String(profileImage);
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user (Photographer or Client)
export const register = catchAsync(async (req: Request, res: Response) => {
  if (withCors(req, res)) return;

  const { full_name, email, password, phone, role, location, specialization } = req.body;

  // Validation
  if (!full_name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Full name, email, and password are required",
    });
  }

  // Validate role
  if (role && !["PHOTOGRAPHER", "CLIENT"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Only PHOTOGRAPHER and CLIENT can register",
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  // Check if there's a pending registration for this email
  const existingPending = await prisma.pendingRegistration.findUnique({
    where: { email },
  });

  // Hash password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Generate OTP
  const otp_code = generateOTP();
  const otp_expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Create or update pending registration (don't create user yet)
  const pendingRegistration = existingPending
    ? await prisma.pendingRegistration.update({
        where: { email },
        data: {
          full_name,
          password_hash,
          phone: phone || null,
          location: location || null,
          specialization: specialization || null,
          role: role || "CLIENT",
          otp_code,
          otp_expires_at,
        },
      })
    : await prisma.pendingRegistration.create({
        data: {
          full_name,
          email,
          password_hash,
          phone: phone || null,
          location: location || null,
          specialization: specialization || null,
          role: role || "CLIENT",
          otp_code,
          otp_expires_at,
        },
      });

  // Send OTP email
  try {
    await sendOTPEmail(email, otp_code, full_name);
    console.log(`OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // Delete pending registration if email fails
    await prisma.pendingRegistration.delete({
      where: { email },
    });
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email. Please try again.",
    });
  }

  // Return success message (no user_id since user is not created yet)
  res.status(201).json({
    success: true,
    message: "OTP sent to your email. Please verify to complete registration.",
    data: {
      email: pendingRegistration.email,
      full_name: pendingRegistration.full_name,
      role: pendingRegistration.role,
    },
  });
});

// Verify OTP
export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  if (withCors(req, res)) return;

  const { email, otp_code } = req.body;

  if (!email || !otp_code) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP code are required",
    });
  }

  // Check if user already exists (already verified)
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already registered. Please login instead.",
    });
  }

  // Find pending registration
  const pendingRegistration = await prisma.pendingRegistration.findUnique({
    where: { email },
  });

  if (!pendingRegistration) {
    return res.status(404).json({
      success: false,
      message: "No pending registration found. Please register first.",
    });
  }

  // Check if OTP matches
  if (pendingRegistration.otp_code !== otp_code) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP code",
    });
  }

  // Check if OTP expired
  if (pendingRegistration.otp_expires_at < new Date()) {
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one.",
    });
  }

  // Create user in database only after OTP verification
  const user = await prisma.user.create({
    data: {
      full_name: pendingRegistration.full_name,
      email: pendingRegistration.email,
      password_hash: pendingRegistration.password_hash,
      phone: pendingRegistration.phone,
      location: pendingRegistration.location,
      specialization: pendingRegistration.specialization,
      role: pendingRegistration.role,
      email_verified: true,
    },
  });

  // Delete pending registration after successful user creation
  await prisma.pendingRegistration.delete({
    where: { email },
  });

  res.json({
    success: true,
    message: "Email verified successfully. Your account has been created.",
    data: {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
    },
  });
});

// Resend OTP
export const resendOTP = catchAsync(async (req: Request, res: Response) => {
  if (withCors(req, res)) return;

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  // Check if user already exists (already verified)
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already registered. Please login instead.",
    });
  }

  // Find pending registration
  const pendingRegistration = await prisma.pendingRegistration.findUnique({
    where: { email },
  });

  if (!pendingRegistration) {
    return res.status(404).json({
      success: false,
      message: "No pending registration found. Please register first.",
    });
  }

  // Generate new OTP
  const otp_code = generateOTP();
  const otp_expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Update pending registration with new OTP
  await prisma.pendingRegistration.update({
    where: { email },
    data: {
      otp_code,
      otp_expires_at,
    },
  });

  // Send OTP email
  try {
    await sendOTPEmail(email, otp_code, pendingRegistration.full_name);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email",
    });
  }

  res.json({
    success: true,
    message: "OTP resent successfully. Please check your email.",
  });
});

// Login user
export const login = catchAsync(async (req: Request, res: Response) => {
  if (withCors(req, res)) return;

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  // Find user with KYC verification info
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      kyc_verification: {
        select: { status: true },
      },
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check if email is verified
  if (!user.email_verified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email before logging in",
    });
  }

  // Check if account is blocked or warned
  if (user.status === "BLOCKED") {
    return res.status(403).json({
      success: false,
      message:
        "Your account has been blocked due to a violation. Please contact support.",
    });
  }

  if (user.status === "WARNING") {
    // Allow login but include warning info in response (handled on frontend)
  }

  // Determine KYC status correctly by checking actual KycVerification record
  let kycStatus = "not_submitted";
  if (user.kyc_verification) {
    // KYC form has been submitted, check the status
    if (
      user.kyc_verification.status === "APPROVED" &&
      user.kyc_verified === true
    ) {
      kycStatus = "verified";
    } else if (user.kyc_verification.status === "PENDING") {
      kycStatus = "pending";
    } else if (user.kyc_verification.status === "REJECTED") {
      kycStatus = "rejected";
    }
  }
  // If no kyc_verification record exists, status remains 'not_submitted'

  // Fetch photographer-specific stats only for PHOTOGRAPHER role
  let specialization = user.specialization || (user.role === "PHOTOGRAPHER" ? "Professional Photographer" : "");
  let badge = user.role === "PHOTOGRAPHER" ? "Beginner" : "";
  let commission_percentage = 10;
  let rating = 0;
  let reviews = 0;
  let total_bookings = 0;
  let earnings = 0;
  let location = user.location || "Kathmandu, Nepal";

  if (user.role === "PHOTOGRAPHER") {
    // 1. Determine specialization if not set
    if (!user.specialization) {
      const latestPortfolio = await prisma.portfolio.findFirst({
        where: { user_id: user.user_id },
        orderBy: { created_at: "desc" },
      });
      if (latestPortfolio && latestPortfolio.title) {
        specialization = latestPortfolio.title;
      }
    }

    // 2. Fetch badge and rewards
    const reward = await prisma.reward.findUnique({
      where: { user_id: user.user_id },
      include: { badge: true },
    });
    if (reward && reward.badge) {
      badge = reward.badge.badge_name;
      commission_percentage = (reward.badge as any).commission_percentage || 10;
    } else {
      // Get the lowest badge name if no reward record exists
      const rookieBadge = await prisma.badge.findFirst({
        orderBy: { points_required: "asc" },
      });
      if (rookieBadge) badge = rookieBadge.badge_name;
    }

    // 3. Aggregate reviews and rating
    const reviewsAgg = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { review_id: true },
      where: { booking: { photographer_id: user.user_id } },
    });
    rating = reviewsAgg._avg.rating || 0;
    reviews = reviewsAgg._count.review_id || 0;

    // 4. Aggregate bookings and earnings
    const bookingsCountAgg = await prisma.booking.aggregate({
      _count: { booking_id: true },
      where: { photographer_id: user.user_id },
    });
    total_bookings = bookingsCountAgg._count.booking_id || 0;

    const earningsAgg = await prisma.booking.findMany({
      where: {
        photographer_id: user.user_id,
        status: { status_name: "COMPLETED" },
      },
      select: {
        amount: true,
        payment: { select: { photographer_amount: true } },
      },
    });
    earnings = earningsAgg.reduce((sum, b) => {
      const netAmount = b.payment?.photographer_amount
        ? Number(b.payment.photographer_amount)
        : Number(b.amount);
      return sum + netAmount;
    }, 0);

    // 5. Fetch location from KYC if not set
    if (!user.location) {
      const latestKyc = await prisma.kycVerification.findFirst({
        where: { user_id: user.user_id },
        orderBy: { created_at: "desc" },
      });
      if (latestKyc) {
        const { address_city, address_district, address_province } = latestKyc;
        location = [address_city, address_district, address_province]
          .filter(Boolean)
          .join(", ") || location;
      }
    }
  }

  // Generate JWT token with aggregated payload
  const token = jwt.sign(
    {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      location,
      created_at: user.created_at,
      specialization,
      badge,
      rating,
      total_bookings,
      earnings,
      reviews,
      kycStatus,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  // Track login for points
  const { trackLogin } = await import("../services/pointsService");
  await trackLogin(user.user_id);

  // Return user data and token
  res.json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile_image: user.profile_image,
        bio: user.bio,
        kyc_verified: user.role === "ADMIN" ? undefined : user.kyc_verified,
        email_verified: user.email_verified,
        is_verified: user.role === "ADMIN" ? true : user.kyc_verified,
      },
    },
  });
});

// Forgot password - sends OTP to email
export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    if (withCors(req, res)) return;

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }

    // Generate OTP
    const otp_code = generateOTP();
    const otp_expires_at = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Check if password reset already exists for this email
    const existingReset = await prisma.passwordReset.findUnique({
      where: { email },
    });

    // Create or update password reset record
    if (existingReset) {
      await prisma.passwordReset.update({
        where: { email },
        data: {
          otp_code,
          otp_expires_at,
        },
      });
    } else {
      await prisma.passwordReset.create({
        data: {
          email,
          otp_code,
          otp_expires_at,
        },
      });
    }

    // Send OTP email
    try {
      await sendPasswordResetOTPEmail(email, otp_code, user.full_name);
      console.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      console.error("Error sending OTP email:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    res.json({
      success: true,
      message: "OTP sent to your email. Please verify to reset your password.",
      data: {
        email: user.email,
        full_name: user.full_name,
      },
    });
  },
);

// Verify password reset OTP
export const verifyPasswordResetOTP = catchAsync(
  async (req: Request, res: Response) => {
    if (withCors(req, res)) return;

    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP code are required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }

    // Find password reset record
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { email },
    });

    if (!resetRecord) {
      return res.status(404).json({
        success: false,
        message:
          "No password reset request found. Please request a password reset first.",
      });
    }

    // Check if OTP matches
    if (resetRecord.otp_code !== otp_code) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
    }

    // Check if OTP expired
    if (resetRecord.otp_expires_at < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new password reset.",
      });
    }

    res.json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      data: {
        email: user.email,
      },
    });
  },
);

// Reset password
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  if (withCors(req, res)) return;

  const { email, otp_code, new_password } = req.body;

  if (!email || !otp_code || !new_password) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP code, and new password are required",
    });
  }

  // Validate password length
  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User with this email does not exist",
    });
  }

  // Find password reset record
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { email },
  });

  if (!resetRecord) {
    return res.status(404).json({
      success: false,
      message: "No password reset request found.",
    });
  }

  // Check if OTP matches
  if (resetRecord.otp_code !== otp_code) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP code",
    });
  }

  // Check if OTP expired
  if (resetRecord.otp_expires_at < new Date()) {
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new password reset.",
    });
  }

  // Hash new password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(new_password, saltRounds);

  // Update user password
  await prisma.user.update({
    where: { email },
    data: {
      password_hash,
    },
  });

  // Delete password reset record after successful reset
  await prisma.passwordReset.delete({
    where: { email },
  });

  res.json({
    success: true,
    message:
      "Password reset successfully. You can now login with your new password.",
    data: {
      email: user.email,
      full_name: user.full_name,
    },
  });
});

// Update basic profile information (applies to all roles)
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { full_name, phone, profile_image, bio, specialization } = req.body;

  const data: Record<string, unknown> = {};
  if (full_name) data.full_name = full_name;
  if (phone) data.phone = phone;
  if (profile_image !== undefined) {
    const normalizedProfileImage = normalizeProfileImageInput(profile_image);
    data.profile_image = normalizedProfileImage;
  }
  if (bio) data.bio = bio;
  if (specialization) data.specialization = specialization;
  if (req.body.location) data.location = req.body.location;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No profile fields provided to update",
    });
  }

  const user: any = await prisma.user.update({
    where: { user_id: authUser.user_id },
    data,
    select: {
      user_id: true,
      full_name: true,
      email: true,
      phone: true,
      profile_image: true,
      bio: true,
      specialization: true,
      location: true,
      role: true,
      kyc_verified: true,
      kyc_document_url: true,
    } as any,
  });

  // Emit socket event for real-time updates if the user is a photographer
  if (user.role === "PHOTOGRAPHER" && (req as any).io) {
    (req as any).io.emit("photographer_updated", {
      photographerId: user.user_id,
      type: "profile_update",
    });
  }

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// Photographers update personal profile (trust-building fields)
export const updatePhotographerProfile = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (authUser.role !== "PHOTOGRAPHER") {
      return res.status(403).json({
        success: false,
        message: "Only photographers can update this profile section",
      });
    }

    const { full_name, phone, profile_image, bio, location, specialization } =
      req.body;

    const data: Record<string, unknown> = {};
    if (full_name) data.full_name = full_name;
    if (phone) data.phone = phone;
    if (profile_image !== undefined) {
      const normalizedProfileImage = normalizeProfileImageInput(profile_image);
      data.profile_image = normalizedProfileImage;
    }
    if (bio) data.bio = bio;
    if (location !== undefined) data.location = location;
    if (specialization !== undefined) data.specialization = specialization;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile fields provided to update",
      });
    }

    const user = await prisma.user.update({
      where: { user_id: authUser.user_id },
      data,
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone: true,
        profile_image: true,
        bio: true,
        specialization: true,
        location: true,
        role: true,
        kyc_verified: true,
      },
    });

    // Emit socket event for real-time updates (we already checked it's a photographer)
    if ((req as any).io) {
      (req as any).io.emit("photographer_updated", {
        photographerId: user.user_id,
        type: "profile_update",
      });
    }

    res.json({
      success: true,
      message: "Photographer profile updated successfully",
      data: user,
    });
  },
);

// Submit or update KYC verification form (requires bearer token)
export const submitKycForm = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Bearer token required.",
    });
  }

  // Find user by authenticated user_id
  const dbUser = await prisma.user.findUnique({
    where: { user_id: authUser.user_id },
    select: { user_id: true, role: true, email_verified: true },
  });

  if (!dbUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!dbUser.email_verified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email before submitting KYC",
    });
  }

  const {
    full_name,
    date_of_birth,
    gender,
    contact_number,
    email,
    address_city,
    address_district,
    address_province,
    user_role,
    username,
    registered_email,
    registered_phone,
    document_type,
    document_number,
    issued_by,
    issue_date,
    expiry_date,
    document_front_url,
    document_back_url,
    consent_confirmed,
    consent_verify,
    consent_false_info,
  } = req.body;

  const allowedDocumentTypes = ["CITIZENSHIP", "PASSPORT", "DRIVING_LICENSE"];

  if (
    !full_name ||
    !contact_number ||
    !email ||
    !address_city ||
    !address_district ||
    !address_province
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Personal information is incomplete" });
  }

  if (!document_type || !allowedDocumentTypes.includes(document_type)) {
    return res.status(400).json({
      success: false,
      message:
        "document_type must be one of CITIZENSHIP, PASSPORT, DRIVING_LICENSE",
    });
  }

  if (!document_number || !document_front_url) {
    return res.status(400).json({
      success: false,
      message: "Document number and front image are required",
    });
  }

  if (!(consent_confirmed && consent_verify && consent_false_info)) {
    return res.status(400).json({
      success: false,
      message: "All declarations and consents must be accepted",
    });
  }

  const parsedDob = parseDateOrNull(date_of_birth);
  const parsedIssue = parseDateOrNull(issue_date);
  const parsedExpiry = parseDateOrNull(expiry_date);

  const resolvedRole = (user_role as string | undefined) || dbUser.role;

  if (resolvedRole !== dbUser.role) {
    return res.status(400).json({
      success: false,
      message: "Provided user_role does not match account role",
    });
  }

  const kyc = await prisma.kycVerification.upsert({
    where: { user_id: dbUser.user_id },
    update: {
      full_name,
      date_of_birth: parsedDob,
      gender: gender || null,
      contact_number,
      email,
      address_city,
      address_district,
      address_province,
      user_role: resolvedRole,
      username: username || null,
      registered_email: registered_email || null,
      registered_phone: registered_phone || null,
      document_type,
      document_number,
      issued_by: issued_by || null,
      issue_date: parsedIssue,
      expiry_date: parsedExpiry,
      document_front_url,
      document_back_url: document_back_url || null,
      consent_confirmed: Boolean(consent_confirmed),
      consent_verify: Boolean(consent_verify),
      consent_false_info: Boolean(consent_false_info),
      status: "PENDING",
      verified_by: null,
      remarks: null,
      verified_at: null,
    },
    create: {
      user_id: dbUser.user_id,
      full_name,
      date_of_birth: parsedDob,
      gender: gender || null,
      contact_number,
      email,
      address_city,
      address_district,
      address_province,
      user_role: resolvedRole,
      username: username || null,
      registered_email: registered_email || null,
      registered_phone: registered_phone || null,
      document_type,
      document_number,
      issued_by: issued_by || null,
      issue_date: parsedIssue,
      expiry_date: parsedExpiry,
      document_front_url,
      document_back_url: document_back_url || null,
      consent_confirmed: Boolean(consent_confirmed),
      consent_verify: Boolean(consent_verify),
      consent_false_info: Boolean(consent_false_info),
      status: "PENDING",
    },
    select: {
      kyc_id: true,
      status: true,
      document_type: true,
      document_number: true,
      document_front_url: true,
      document_back_url: true,
      verified_at: true,
      remarks: true,
      updated_at: true,
    },
  });

  // Reset user flag to pending verification
  await prisma.user.update({
    where: { user_id: dbUser.user_id },
    data: { kyc_verified: false, kyc_document_url: document_front_url },
  });

  res.json({
    success: true,
    message: "KYC submitted. Awaiting admin review.",
    data: kyc,
  });
});

// Get current user's KYC status
export const getKycStatus = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const kyc = await prisma.kycVerification.findUnique({
    where: { user_id: authUser.user_id },
    select: {
      kyc_id: true,
      status: true,
      remarks: true,
      verified_at: true,
      verified_by: true,
      document_type: true,
      document_number: true,
      document_front_url: true,
      document_back_url: true,
      updated_at: true,
      created_at: true,
    },
  });

  if (!kyc) {
    return res
      .status(404)
      .json({ success: false, message: "No KYC submission found" });
  }

  res.json({ success: true, data: kyc });
});

// reviewKyc has been moved to adminController.ts

// Get current authenticated user profile
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user: any = await prisma.user.findUnique({
    where: { user_id: authUser.user_id },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      phone: true,
      profile_image: true,
      bio: true,
      location: true,
      role: true,
      kyc_verified: true,
      email_verified: true,
      created_at: true,
    } as any,
  });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  let stats = {};

  if (user.role === "CLIENT") {
    const totalBookings = await prisma.booking.count({
      where: { client_id: user.user_id },
    });

    const totalReviews = await prisma.review.count({
      where: { reviewer_id: user.user_id },
    });

    const totalSpentAgg = await prisma.booking.aggregate({
      _sum: { amount: true },
      where: { client_id: user.user_id },
    });

    const totalSpent = totalSpentAgg._sum.amount
      ? Number(totalSpentAgg._sum.amount)
      : 0;

    stats = {
      totalBookings,
      totalReviews,
      totalSpent,
    };
  } else if (user.role === "PHOTOGRAPHER") {
    // Reward / Badge information
    const reward = await prisma.reward.findUnique({
      where: { user_id: user.user_id },
      include: { badge: true },
    });

    let rank = "N/A";
    let points = reward?.total_points || 0;
    let badge = pointsService.getBadgeTier(points);
    let commission_percentage = 10;
    if (reward && reward.badge) {
      commission_percentage = (reward.badge as any).commission_percentage || 10;
    }

    if (reward) {
      const photographersWithMorePoints = await prisma.reward.count({
        where: {
          total_points: {
            gt: reward.total_points,
          },
          user: {
            role: "PHOTOGRAPHER",
            status: "ACTIVE",
          },
        },
      });
      rank = `#${photographersWithMorePoints + 1}`;
    }

    // Aggregate reviews and rating
    const reviewsAgg = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { review_id: true },
      where: { booking: { photographer_id: user.user_id } },
    });
    const rating = reviewsAgg._avg.rating || 0;
    const reviews = reviewsAgg._count.review_id || 0;

    // Aggregate total bookings and earnings
    const bookingsCountAgg = await prisma.booking.aggregate({
      _count: { booking_id: true },
      where: { photographer_id: user.user_id },
    });
    const earningsAgg = await prisma.booking.findMany({
      where: {
        photographer_id: user.user_id,
        status: { status_name: "COMPLETED" },
      },
      select: {
        amount: true,
        payment: {
          select: {
            photographer_amount: true,
          },
        },
      },
    });

    const total_bookings = bookingsCountAgg._count.booking_id || 0;
    const earnings = earningsAgg.reduce((sum: number, b: any) => {
      const netAmount = b.payment?.photographer_amount
        ? Number(b.payment.photographer_amount)
        : Number(b.amount);
      return sum + netAmount;
    }, 0);

    stats = {
      points,
      rank,
      badge,
      rating: rating.toFixed(1),
      reviews,
      total_bookings,
      earnings,
      commission_percentage: Number(commission_percentage),
    };
  }

  res.json({
    success: true,
    data: {
      ...user,
      ...stats,
    },
  });
});

// Upload profile image (multer disk -> path string)
export const uploadAvatar = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const profileImageMeta = {
    file_name: req.file.originalname,
    mime_type: req.file.mimetype,
    size: req.file.size,
    uploaded_at: new Date().toISOString(),
  };
  const profileImagePath = `/assets/profiles/${req.file.filename}`;

  const user = await prisma.user.update({
    where: { user_id: authUser.user_id },
    data: {
      profile_image: profileImagePath,
    },
    select: {
      user_id: true,
      full_name: true,
      profile_image: true,
      role: true,
    },
  });

  if ((req as any).io) {
    (req as any).io.emit("user_profile_updated", {
      user_id: user.user_id,
      profile_image: user.profile_image,
    });

    if (user.role === "PHOTOGRAPHER") {
      (req as any).io.emit("photographer_updated", {
        photographerId: user.user_id,
        type: "profile_image_update",
      });
    }
  }

  res.json({
    success: true,
    message: "Profile image uploaded successfully",
    data: user,
  });
});

// Stream profile image binary from DB
export const getProfileImage = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        profile_image: true,
      },
    });

    if (!user || !user.profile_image) {
      return res
        .status(404)
        .json({ success: false, message: "Profile image not found" });
    }

    // Attempt to serve from disk if it starts with /assets/
    // If it's a completely external URL (e.g. Google auth), redirect instead
    if (user.profile_image.startsWith('http')) {
      return res.redirect(user.profile_image);
    }

    const fs = require('fs');
    const path = require('path');
    const absolutePath = path.join(process.cwd(), user.profile_image);

    if (!fs.existsSync(absolutePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Profile image file not found on disk" });
    }

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(absolutePath);
  },
);
// Upload KYC documents
export const uploadKycDocuments = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Relative path to return to frontend for storing in DB
    const kycDocPath = `/assets/kyc_documents/${req.file.filename}`;

    res.json({
      success: true,
      message: "KYC document uploaded successfully",
      data: {
        url: kycDocPath,
        filename: req.file.filename,
      },
    });
  },
);

// Submit a report against another user
export const submitReport = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { target_user_id, reason } = req.body;

  if (!target_user_id || !reason || reason.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "target_user_id and reason are required",
    });
  }

  if (authUser.user_id === target_user_id) {
    return res
      .status(400)
      .json({ success: false, message: "You cannot report yourself" });
  }

  // Get or create default status
  let reportStatus = await prisma.reportStatus.findFirst({
    where: { status_name: "OPEN" },
  });
  if (!reportStatus) {
    reportStatus = await prisma.reportStatus.create({
      data: { status_name: "OPEN" },
    });
  }

  const report = await prisma.report.create({
    data: {
      reported_by: authUser.user_id,
      target_user: target_user_id,
      reason: reason.trim(),
      status_id: reportStatus.status_id,
    },
    include: {
      reporter: { select: { full_name: true, email: true } },
      target: { select: { full_name: true, email: true } },
    },
  });

  // Notify all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { user_id: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        user_id: admin.user_id,
        title: "New Report Submitted",
        message: `${report.reporter.full_name} reported ${report.target.full_name}: ${reason.substring(0, 50)}...`,
        type: "REPORT",
      },
    });
  }

  // Emit socket event to admins
  const io = (req as any).io;
  if (io) {
    io.emit("new_report", {
      report_id: report.report_id,
      reported_by: report.reporter.full_name,
      target_user: report.target.full_name,
      reason: report.reason,
      created_at: report.reported_at,
    });

    // Notify all admins individually
    for (const admin of admins) {
      const normalizedAdminId = String(admin.user_id).toLowerCase();
      io.to(normalizedAdminId).emit("notification", {
        title: "New Report",
        message: `${report.reporter.full_name} reported ${report.target.full_name}`,
        type: "REPORT",
      });
    }
  }

  res.json({
    success: true,
    message: "Report submitted successfully. Admin will review.",
    data: report,
  });
});
