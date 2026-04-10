import type { Request, Response } from "express";
import prisma from "../model/index";
import catchAsync from "../utils/catchAsync";
import { getFullImageUrl } from "../utils/imageUtils";

/**
 * Get overall dashboard statistics for admins
 * Move and enhanced from userController
 */
export const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser || authUser.role !== "ADMIN") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }

  // Count users by role and status
  const [totalUsers, clients, photographers, blockedUsers, warningUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({ where: { role: "PHOTOGRAPHER" } }),
      prisma.user.count({ where: { status: "BLOCKED" } }),
      prisma.user.count({ where: { status: "WARNING" } }),
    ]);

  // Pending KYC
  const pendingKYC = await prisma.kycVerification.count({
    where: { status: "PENDING" },
  });

  // Bookings stats
  const [totalBookings, activeBookings, completedBookings, cancelledBookings] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({
        where: { status: { status_name: { in: ["PENDING", "CONFIRMED"] } } },
      }),
      prisma.booking.count({
        where: { status: { status_name: "COMPLETED" } },
      }),
      prisma.booking.count({
        where: { status: { status_name: "CANCELLED" } },
      }),
    ]);

  // Revenue & Earnings
  const revenueAgg = await prisma.payment.aggregate({
    _sum: { amount: true, commission_amount: true },
    where: { status: { status_name: "COMPLETED" } },
  });

  const totalRevenue = revenueAgg._sum?.amount
    ? Number(revenueAgg._sum.amount)
    : 0;
  const platformEarnings = revenueAgg._sum?.commission_amount
    ? Number(revenueAgg._sum.commission_amount)
    : 0;

  // Calculate Today's Earnings
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todayRevenueAgg = await prisma.payment.aggregate({
    _sum: { commission_amount: true },
    where: {
      status: { status_name: "COMPLETED" },
      paid_at: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  const todayEarnings = todayRevenueAgg._sum?.commission_amount
    ? Number(todayRevenueAgg._sum.commission_amount)
    : 0;

  // Recent 10 reports
  const recentReports = await prisma.report.findMany({
    take: 10,
    orderBy: { reported_at: "desc" },
    include: {
      reporter: { select: { full_name: true } },
      target: { select: { full_name: true } },
      status: true,
    },
  });

  // Recent activities (last 10 bookings)
  const recentBookings = await prisma.booking.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    include: {
      client: { select: { full_name: true } },
      photographer: { select: { full_name: true } },
      status: { select: { status_name: true } },
    },
  });

  const recentActivities = [
    ...recentBookings.map((b: any) => ({
      id: `booking-${b.booking_id}`,
      type: "booking",
      user: b.client?.full_name || "System",
      action: `Booked ${b.photographer?.full_name || "photographer"} — ${b.status?.status_name}`,
      time: getTimeAgo(b.created_at),
      timestamp: b.created_at,
    })),
    ...recentReports.map((r: any) => ({
      id: `report-${r.report_id}`,
      type: "report",
      user: r.reporter?.full_name || "System",
      action: `Reported ${r.target?.full_name || "user"}: ${r.reason}`,
      time: getTimeAgo(r.reported_at),
      timestamp: r.reported_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 15);

  res.json({
    success: true,
    data: {
      totalUsers,
      clients,
      photographers,
      blockedUsers,
      warningUsers,
      pendingKYC,
      totalBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      platformEarnings,
      todayEarnings,
      recentActivities,
    },
  });
});

/**
 * List all users with pagination and filtering
 */
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { role: { not: "ADMIN" } };
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { full_name: { contains: String(search), mode: "insensitive" } },
      { email: { contains: String(search), mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone: true,
        profile_image: true,
        role: true,
        status: true,
        kyc_verified: true,
        created_at: true,
        _count: {
          select: {
            bookings_as_client: true,
            bookings_as_photographer: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users.map((u: any) => ({
      ...u,
      profile_image: getFullImageUrl(u.profile_image),
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Warn or Block a user
 */
export const updateUserStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!["ACTIVE", "WARNING", "BLOCKED"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const user = await prisma.user.update({
      where: { user_id: userId },
      data: { status },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        status: true,
        role: true,
      },
    });

    // Create notification for the user
    const title =
      status === "BLOCKED"
        ? "Account Blocked"
        : status === "WARNING"
          ? "Account Warning"
          : "Account Activated";

    const message =
      status === "BLOCKED"
        ? `Your account has been blocked. ${reason ? `Reason: ${reason}` : ""}`
        : status === "WARNING"
          ? `Your account received a warning. ${reason ? `Reason: ${reason}` : ""}`
          : "Your account has been activated";

    await prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        type: "SYSTEM",
      },
    });

    // Emit real-time socket event to the user
    const io = (req as any).io;
    if (io) {
      const normalizedUserId = String(userId).toLowerCase();
      io.to(normalizedUserId).emit("account_status_updated", {
        status: status,
        title,
        message,
      });

      io.to(normalizedUserId).emit("notification", {
        title,
        message,
      });
    }

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: user,
    });
  },
);

/**
 * Get all pending KYC submissions
 */
export const getPendingKyc = catchAsync(async (req: Request, res: Response) => {
  const pending = await prisma.kycVerification.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: {
          full_name: true,
          email: true,
          profile_image: true,
        },
      },
    },
    orderBy: { created_at: "asc" },
  });

  res.json({
    success: true,
    data: pending.map((p: any) => ({
      ...p,
      user: p.user
        ? {
            ...p.user,
            profile_image: getFullImageUrl(p.user.profile_image),
          }
        : null,
    })),
  });
});

/**
 * Admin reviews KYC submissions
 */
export const reviewKyc = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser || authUser.role !== "ADMIN") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  const { kyc_id, status, remarks } = req.body;

  if (!kyc_id || !["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "kyc_id and status (APPROVED|REJECTED) are required",
    });
  }

  const updated = await prisma.kycVerification.update({
    where: { kyc_id },
    data: {
      status,
      remarks: remarks || null,
      verified_by: authUser.user_id,
      verified_at: new Date(),
    },
    select: {
      kyc_id: true,
      user_id: true,
      status: true,
      document_type: true,
      document_number: true,
      document_front_url: true,
      document_back_url: true,
      verified_at: true,
      remarks: true,
      updated_at: true,
      created_at: true,
    },
  });

  const updatedUser = await prisma.user.update({
    where: { user_id: updated.user_id },
    data: { kyc_verified: status === "APPROVED" },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      kyc_verified: true,
    },
  });

  if (status === "APPROVED") {
    try {
      const { awardKycApprovalPoints } =
        await import("../services/pointsService");
      await awardKycApprovalPoints(updated.user_id);
    } catch (e) {
      console.error("Failed to award points:", e);
    }

    await prisma.notification.create({
      data: {
        user_id: updated.user_id,
        title: "KYC Approved",
        message: "Your KYC documents have been verified successfully.",
        type: "SYSTEM",
      },
    });
  } else if (status === "REJECTED") {
    await prisma.notification.create({
      data: {
        user_id: updated.user_id,
        title: "KYC Rejected",
        message: remarks
          ? `Your KYC verification failed: ${remarks}`
          : "Your KYC verification was rejected. Please re-upload.",
        type: "SYSTEM",
      },
    });
  }

  const io = (req as any).io;
  if (io) {
    const normalizedUserId = String(updated.user_id).toLowerCase();
    io.to(normalizedUserId).emit("kyc_status_updated", {
      status: status,
      message:
        status === "APPROVED"
          ? "Your KYC is approved."
          : "Your KYC was rejected.",
    });
    io.to(normalizedUserId).emit("notification", {
      title: `KYC ${status}`,
      message: `Your KYC verification was ${status.toLowerCase()}.`,
    });
  }

  res.json({
    success: true,
    message: `KYC ${status.toLowerCase()}`,
    data: updated,
  });
});

/**
 * List all reports
 */
export const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { user_id: true, full_name: true, email: true } },
      target: {
        select: { user_id: true, full_name: true, email: true, status: true },
      },
      status: true,
    },
    orderBy: { reported_at: "desc" },
  });

  res.json({
    success: true,
    data: reports,
  });
});

/**
 * Update report status
 */
export const updateReportStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const { status_name } = req.body;

    const reportStatus = await prisma.reportStatus.findUnique({
      where: { status_name },
    });

    if (!reportStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid report status" });
    }

    const report = await prisma.report.update({
      where: { report_id: Number(reportId) },
      data: { status_id: reportStatus.status_id },
    });

    res.json({
      success: true,
      message: "Report status updated",
      data: report,
    });
  },
);

/**
 * List all bookings for admin
 */
export const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (status) {
    where.status = { status_name: status };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
      include: {
        client: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_image: true,
          },
        },
        photographer: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_image: true,
            rewards: {
              include: { badge: true }
            }
          },
        },
        status: true,
        package: true,
        payment: {
          include: { status: true }
        }
      },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    success: true,
    data: bookings.map((b: any) => ({
      ...b,
      client: b.client
        ? {
            ...b.client,
            profile_image: getFullImageUrl(b.client.profile_image),
          }
        : null,
      photographer: b.photographer
        ? {
            ...b.photographer,
            profile_image: getFullImageUrl(b.photographer.profile_image),
          }
        : null,
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}
