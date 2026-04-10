import { Request, Response } from "express";
import fs from "fs";
import prisma from "../model/index";
import * as pointsService from "../services/pointsService";
import catchAsync from "../utils/catchAsync";
import { getFullImageUrl } from "../utils/imageUtils";

// GET /api/photographers/:photographerId
// Get a photographer by id with their details and recent portfolio images
export const getPhotographerByIdWithRecentPortfolios = catchAsync(
  async (req: Request, res: Response) => {
    const { photographerId } = req.params;
    const RECENT_IMAGE_COUNT = 3;

    const photographer = await prisma.user.findUnique({
      where: { user_id: photographerId },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone: true,
        profile_image: true,
        bio: true,
        specialization: true,
        role: true,
        packages: true,
        location: true,
        rewards: {
          include: {
            badge: true,
          },
        },
        reviews_received: {
          include: {
            reviewer: {
              select: {
                full_name: true,
                profile_image: true,
              },
            },
          },
        },
      },
    });

    if (!photographer || photographer.role !== "PHOTOGRAPHER") {
      return res
        .status(404)
        .json({ success: false, message: "Photographer not found" });
    }

    // Calculate total completed bookings and average rating
    const [totalBookings, reviews] = await Promise.all([
      prisma.booking.count({
        where: {
          photographer_id: photographerId,
          status: {
            status_name: "COMPLETED",
          },
        },
      }),
      prisma.review.findMany({
        where: { photographer_id: photographerId },
        select: { rating: true },
      }),
    ]);

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0.0;

    // Calculate Rank base on rewards.total_points
    const points = photographer.rewards?.total_points || 0;
    const photographersWithMorePoints = await prisma.reward.count({
      where: {
        total_points: {
          gt: points,
        },
        user: {
          role: "PHOTOGRAPHER",
          status: "ACTIVE",
        },
      },
    });
    const rank = `#${photographersWithMorePoints + 1}`;

    const portfolios = await prisma.portfolio.findMany({
      where: { user_id: photographer.user_id },
      select: { portfolio_id: true },
    });
    const portfolioIds = portfolios.map((p: any) => p.portfolio_id);

    const recentImages =
      portfolioIds.length > 0
        ? await prisma.portfolioImage.findMany({
            where: { portfolio_id: { in: portfolioIds } },
            orderBy: { image_id: "desc" },
            take: RECENT_IMAGE_COUNT,
          })
        : [];

    const recentImagesWithUrl = enrichImagesWithUrl(recentImages);

    return res.json({
      success: true,
      data: {
        ...photographer,
        profile_image: getFullImageUrl(photographer.profile_image),
        reviews: photographer.reviews_received, // Map to 'reviews' for frontend compatibility
        total_bookings: totalBookings,
        rank: rank,
        points: points,
        badge: pointsService.getBadgeTier(points),
        avg_rating: avgRating,
        total_reviews: totalReviews,
      },
    });
  },
);

const UPLOAD_CATEGORIES = [
  "Portrait",
  "Landscape",
  "Wildlife",
  "Street",
  "Fashion",
  "Event",
  "Sports",
  "Product",
  "Food",
  "Travel",
  "Fine Art",
  "Conceptual",
  "Abstract",
  "Black & White",
  "Silhouette",
  "Macro",
  "Astrophotography",
  "Long Exposure",
  "Aerial/Drone",
  "Architectural",
  "Real Estate",
  "Commercial",
  "Editorial",
  "Documentary",
  "Photojournalism",
  "Lifestyle",
  "Influencer/Instagram",
  "Cinematic",
  "Minimalist",
  "Other"
] as const;

type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

const PORTFOLIO_CATEGORY_NAMES = [
  "PORTRAIT",
  "LANDSCAPE",
  "WILDLIFE",
  "STREET",
  "FASHION",
  "EVENT",
  "SPORTS",
  "PRODUCT",
  "FOOD",
  "TRAVEL",
  "FINE_ART",
  "CONCEPTUAL",
  "ABSTRACT",
  "BLACK_AND_WHITE",
  "SILHOUETTE",
  "MACRO",
  "ASTROPHOTOGRAPHY",
  "LONG_EXPOSURE",
  "AERIAL_DRONE",
  "ARCHITECTURAL",
  "REAL_ESTATE",
  "COMMERCIAL",
  "EDITORIAL",
  "DOCUMENTARY",
  "PHOTOJOURNALISM",
  "LIFESTYLE",
  "INFLUENCER_INSTAGRAM",
  "CINEMATIC",
  "MINIMALIST",
  "OTHER"
] as const;

type PortfolioCategoryName = (typeof PORTFOLIO_CATEGORY_NAMES)[number];

const CATEGORY_TO_API: Record<UploadCategory, PortfolioCategoryName> = {
  "Portrait": "PORTRAIT",
  "Landscape": "LANDSCAPE",
  "Wildlife": "WILDLIFE",
  "Street": "STREET",
  "Fashion": "FASHION",
  "Event": "EVENT",
  "Sports": "SPORTS",
  "Product": "PRODUCT",
  "Food": "FOOD",
  "Travel": "TRAVEL",
  "Fine Art": "FINE_ART",
  "Conceptual": "CONCEPTUAL",
  "Abstract": "ABSTRACT",
  "Black & White": "BLACK_AND_WHITE",
  "Silhouette": "SILHOUETTE",
  "Macro": "MACRO",
  "Astrophotography": "ASTROPHOTOGRAPHY",
  "Long Exposure": "LONG_EXPOSURE",
  "Aerial/Drone": "AERIAL_DRONE",
  "Architectural": "ARCHITECTURAL",
  "Real Estate": "REAL_ESTATE",
  "Commercial": "COMMERCIAL",
  "Editorial": "EDITORIAL",
  "Documentary": "DOCUMENTARY",
  "Photojournalism": "PHOTOJOURNALISM",
  "Lifestyle": "LIFESTYLE",
  "Influencer/Instagram": "INFLUENCER_INSTAGRAM",
  "Cinematic": "CINEMATIC",
  "Minimalist": "MINIMALIST",
  "Other": "OTHER"
};

const PORTFOLIO_CATEGORY_SET = new Set<string>(PORTFOLIO_CATEGORY_NAMES);

const normalizeCategoryKey = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const LABEL_TO_CANONICAL = (() => {
  const map = new Map<string, PortfolioCategoryName>();
  for (const label of UPLOAD_CATEGORIES) {
    map.set(normalizeCategoryKey(label), CATEGORY_TO_API[label]);
  }
  return map;
})();

const categoryAliasesForDb = (category: PortfolioCategoryName): string[] => {
  // Backwards-compat for any legacy DB values that used spaces instead of underscores.
  const spaced = category.replace(/_/g, " ");
  return spaced === category ? [category] : [category, spaced];
};

const normalizeCategoryName = (
  value: unknown,
): PortfolioCategoryName | null => {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const fromLabel = LABEL_TO_CANONICAL.get(normalizeCategoryKey(raw));
  if (fromLabel) return fromLabel;

  // Also accept canonical API names, case-insensitively, with spaces/hyphens treated as underscores.
  const enumCandidate = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (PORTFOLIO_CATEGORY_SET.has(enumCandidate))
    return enumCandidate as PortfolioCategoryName;

  return null;
};

const getOrCreateCategory = async (category_name: PortfolioCategoryName) => {
  const aliases = categoryAliasesForDb(category_name);
  const existing = await prisma.category.findFirst({
    where: { category_name: { in: aliases } },
  });
  if (existing) return existing;
  return prisma.category.create({ data: { category_name } });
};

const getOrCreatePortfolioForUserAndCategory = async (
  user_id: string,
  category_id: number,
  category_name: string,
) => {
  const existing = await prisma.portfolio.findFirst({
    where: { user_id, category_id },
  });

  if (existing) return existing;

  return prisma.portfolio.create({
    data: {
      user_id,
      category_id,
      title: `${category_name} Portfolio`,
      description: null,
    },
  });
};

const safeUnlinkIfExists = (absolutePath: string) => {
  try {
    if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
  } catch {
    // ignore filesystem delete errors
  }
};

const enrichImageWithUrl = (image: any) => ({
  ...image,
  image_url: getFullImageUrl(image.image_url) || `/api/photographer/portfolio/image/${image.image_id}`,
});

const enrichImagesWithUrl = (images: any[]) => images.map(enrichImageWithUrl);

// POST /api/photographer/portfolio/images
// multipart/form-data: image=<file>, category=Portrait|Event|...|Fine Art|Real Estate
export const addPortfolioImage = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : null;
    const location =
      typeof req.body?.location === "string"
        ? req.body.location.trim() || null
        : null;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const category = normalizeCategoryName(req.body?.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Use one of: ${UPLOAD_CATEGORIES.join(", ")}`,
      });
    }

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required (field name: image)",
      });
    }

    const cat = await getOrCreateCategory(category);
    const portfolio = await getOrCreatePortfolioForUserAndCategory(
      authUser.user_id,
      cat.category_id,
      cat.category_name,
    );

    const created = await prisma.portfolioImage.create({
      data: {
        portfolio_id: portfolio.portfolio_id,
        title,
        description,
        location,
        mime_type: file.mimetype,
        original_name: file.originalname,
        image_url: `/assets/portfolio/${file.filename}`,
      },
      include: {
        portfolio: {
          include: {
            category: true,
          },
        },
      },
    });

    // Award points for photo upload (max 20 per week)
    const { awardPhotoUploadPoints } =
      await import("../services/pointsService");
    await awardPhotoUploadPoints(authUser.user_id);

    // Emit socket event for real-time updates
    if ((req as any).io) {
      (req as any).io.emit("photographer_updated", {
        photographerId: authUser.user_id,
        type: "portfolio_update",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Portfolio image uploaded successfully (stored in database)",
      data: enrichImageWithUrl(created),
    });
  },
);

// GET /api/photographer/portfolio/images?category=wedding|event|product
export const listMyPortfolioImages = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const category = req.query.category
      ? normalizeCategoryName(req.query.category)
      : null;
    if (req.query.category && !category) {
      return res.status(400).json({
        success: false,
        message: `Invalid category filter. Use one of: ${UPLOAD_CATEGORIES.join(", ")}`,
      });
    }

    const images = await prisma.portfolioImage.findMany({
      where: {
        portfolio: {
          user_id: authUser.user_id,
          ...(category
            ? {
                category: {
                  category_name: { in: categoryAliasesForDb(category) },
                },
              }
            : {}),
        },
      },
      orderBy: { image_id: "desc" },
      include: {
        portfolio: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: "Portfolio images fetched successfully",
      data: enrichImagesWithUrl(images),
    });
  },
);

// PATCH /api/photographer/portfolio/images/:imageId
// body: { category?: wedding|event|product, title?: string, description?: string }
export const updatePortfolioImage = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const imageId = Number(req.params.imageId);
    if (!Number.isFinite(imageId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid imageId" });
    }

    const category = req.body?.category
      ? normalizeCategoryName(req.body.category)
      : undefined;
    if (req.body?.category && category === null) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Use one of: ${UPLOAD_CATEGORIES.join(", ")}`,
      });
    }

    const image = await prisma.portfolioImage.findFirst({
      where: {
        image_id: imageId,
        portfolio: {
          user_id: authUser.user_id,
        },
      },
      include: {
        portfolio: {
          include: { category: true },
        },
      },
    });

    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "Portfolio image not found" });
    }

    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : image.title;
    const description =
      req.body?.description !== undefined
        ? typeof req.body?.description === "string"
          ? req.body.description.trim()
          : null
        : image.description;
    const location =
      req.body?.location !== undefined
        ? typeof req.body?.location === "string"
          ? req.body.location.trim() || null
          : null
        : image.location;
    const categoryStr = req.body?.category
      ? normalizeCategoryName(req.body.category)
      : null;

    let portfolio_id = image.portfolio_id;
    if (categoryStr) {
      const cat = await getOrCreateCategory(categoryStr);
      const portfolio = await getOrCreatePortfolioForUserAndCategory(
        authUser.user_id,
        cat.category_id,
        cat.category_name,
      );
      portfolio_id = portfolio.portfolio_id;
    }

    const updated = await prisma.portfolioImage.update({
      where: { image_id: imageId },
      data: {
        portfolio_id,
        title,
        description,
        location,
      },
      include: {
        portfolio: {
          include: { category: true },
        },
      },
    });

    // Emit socket event for real-time updates
    if ((req as any).io) {
      (req as any).io.emit("photographer_updated", {
        photographerId: authUser.user_id,
        type: "portfolio_update",
      });
    }

    return res.json({
      success: true,
      message: "Portfolio image category updated successfully",
      data: enrichImageWithUrl(updated),
    });
  },
);

// DELETE /api/photographer/portfolio/images/:imageId
export const deletePortfolioImage = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const imageId = Number(req.params.imageId);
    if (!Number.isFinite(imageId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid imageId" });
    }

    const image = await prisma.portfolioImage.findFirst({
      where: {
        image_id: imageId,
        portfolio: {
          user_id: authUser.user_id,
        },
      },
    });

    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "Portfolio image not found" });
    }

    await prisma.portfolioImage.delete({ where: { image_id: imageId } });

    // Emit socket event for real-time updates
    if ((req as any).io) {
      (req as any).io.emit("photographer_updated", {
        photographerId: authUser.user_id,
        type: "portfolio_update",
      });
    }

    return res.json({
      success: true,
      message: "Portfolio image deleted successfully",
    });
  },
);

// GET /api/photographers/:photographerId/portfolio/images?category=wedding|event|product
export const listPhotographerPortfolioImagesPublic = catchAsync(
  async (req: Request, res: Response) => {
    const photographerId = req.params.photographerId;

    const category = req.query.category
      ? normalizeCategoryName(req.query.category)
      : null;
    if (req.query.category && !category) {
      return res.status(400).json({
        success: false,
        message: `Invalid category filter. Use one of: ${UPLOAD_CATEGORIES.join(", ")}`,
      });
    }

    const photographer = await prisma.user.findUnique({
      where: { user_id: photographerId },
      select: {
        user_id: true,
        full_name: true,
        role: true,
        profile_image: true,
        bio: true,
        specialization: true,
      },
    });

    if (!photographer || photographer.role !== "PHOTOGRAPHER") {
      return res
        .status(404)
        .json({ success: false, message: "Photographer not found" });
    }

    const images = await prisma.portfolioImage.findMany({
      where: {
        portfolio: {
          user_id: photographerId,
          ...(category
            ? {
                category: {
                  category_name: { in: categoryAliasesForDb(category) },
                },
              }
            : {}),
        },
      },
      orderBy: { image_id: "desc" },
      include: {
        portfolio: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: "Photographer portfolio images fetched successfully",
      data: {
        photographer,
        images: enrichImagesWithUrl(images),
      },
    });
  },
);

// GET /api/photographer/portfolio/image/:imageId
export const getPortfolioImageBinary = catchAsync(
  async (req: Request, res: Response) => {
    const imageId = Number(req.params.imageId);
    if (isNaN(imageId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid imageId" });
    const image = await prisma.portfolioImage.findUnique({
      where: { image_id: imageId },
    });
    if (!image || !image.image_url) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });
    }
    const absolutePath = process.cwd() + image.image_url;
    if (!fs.existsSync(absolutePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Image file not found on disk" });
    }
    res.set("Content-Type", image.mime_type || "image/jpeg");
    res.sendFile(absolutePath);
  },
);

// GET /api/photographers
// List all photographers with their details and recent portfolio images
export const listAllPhotographersWithRecentPortfolios = catchAsync(
  async (req: Request, res: Response) => {
    // You can adjust the number of recent images per photographer here
    const RECENT_IMAGE_COUNT = 3;

    // Get all photographers
    const photographers = await prisma.user.findMany({
      where: { role: "PHOTOGRAPHER" },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone: true,
        profile_image: true,
        bio: true,
        specialization: true,
        role: true,
        packages: true,
        location: true,
        kyc_verified: true,
        kyc_verification: {
          select: {
            status: true,
          },
        },
        reviews_received: true,
        rewards: {
          include: {
            badge: true,
          },
        },
      },
    });
    console.log(`Fetched ${photographers.length} photographers in listAllPhotographers`);
    if (photographers.length > 0) {
      console.log(`First photographer specialization: ${photographers[0].specialization}`);
    }

    // For each photographer, get their recent portfolio images and calculate aggregate stats
    const results = await Promise.all(
      photographers.map(async (photographer: any) => {
        // Get all images for this photographer across all portfolios
        const allImages = await prisma.portfolioImage.findMany({
          where: { portfolio: { user_id: photographer.user_id } },
          select: { likes_count: true, views_count: true },
        });

        const totalLikes = allImages.reduce(
          (sum: number, img: any) => sum + img.likes_count,
          0,
        );
        const totalViews = allImages.reduce(
          (sum: number, img: any) => sum + img.views_count,
          0,
        );

        const avgRating =
          photographer.reviews_received.length > 0
            ? photographer.reviews_received.reduce(
                (sum: number, r: any) => sum + r.rating,
                0,
              ) / photographer.reviews_received.length
            : 0.0; // Default to 0.0 if no reviews

        // Find all portfolios for this photographer
        const portfolios = await prisma.portfolio.findMany({
          where: { user_id: photographer.user_id },
          select: { portfolio_id: true },
        });
        const portfolioIds = portfolios.map((p: any) => p.portfolio_id);

        // Get recent images
        const recentImages =
          portfolioIds.length > 0
            ? await prisma.portfolioImage.findMany({
                where: { portfolio_id: { in: portfolioIds } },
                orderBy: { image_id: "desc" },
                take: RECENT_IMAGE_COUNT,
                include: {
                  portfolio: {
                    include: {
                      category: true,
                    },
                  },
                },
              })
            : [];

        const points = photographer.rewards?.total_points || 0;
        const badge = pointsService.getBadgeTier(points);

        // Calculate rank
        const photographersWithMorePoints = await prisma.reward.count({
          where: {
            total_points: {
              gt: points,
            },
            user: {
              role: "PHOTOGRAPHER",
              status: "ACTIVE",
            },
          },
        });
        const rank = photographersWithMorePoints + 1;

        return {
          ...photographer,
          profile_image: getFullImageUrl(photographer.profile_image),
          reviews: photographer.reviews_received, // Map to 'reviews' for frontend compatibility
          total_likes: totalLikes,
          total_views: totalViews,
          avg_rating: avgRating,
          recent_portfolio_images: enrichImagesWithUrl(recentImages),
          points: points,
          badge: badge,
          rank: rank,
        };
      }),
    );

    return res.json({
      success: true,
      data: results,
    });
  },
);

/**
 * GET /api/photographer/top
 * Fetches a list of photographers for the dashboard stories bar.
 */
export const getTopPhotographers = catchAsync(
  async (req: Request, res: Response) => {
    const period = (req.query.period as string) || "all-time";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const leaderboard = await pointsService.getLeaderboard(
      limit,
      period,
      "PHOTOGRAPHER",
    );

    // Map to frontend expectations in TopPhotographersLeaderboard.tsx
    const formattedData = leaderboard.map((item: any) => ({
      rank: item.rank,
      user_id: item.userId,
      full_name: item.fullName,
      avatar: item.profileImage,
      points: item.totalPoints,
      badge: item.badgeName,
    }));

    return res.json({
      success: true,
      data: formattedData,
    });
  },
);

/**
 * POST /api/photographer/review
 * Submit a review for a completed booking
 * Body: { booking_id, rating, comment }
 */
export const submitReview = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // Ensure only clients can submit reviews (though route middleware also checks this)
  if (authUser.role !== "CLIENT") {
    return res
      .status(403)
      .json({ success: false, message: "Only clients can submit reviews" });
  }

  console.log("submitReview request body:", req.body);
  const { booking_id, rating } = req.body;
  // Check for common field names for the comment
  const comment =
    req.body.comment ||
    req.body.review ||
    req.body.message ||
    req.body.description ||
    null;

  if (!booking_id || !rating) {
    return res
      .status(400)
      .json({ success: false, message: "booking_id and rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ success: false, message: "Rating must be between 1 and 5" });
  }

  // Find the booking
  const booking = await prisma.booking.findUnique({
    where: { booking_id: Number(booking_id) },
    include: { status: true },
  });

  if (!booking) {
    return res
      .status(404)
      .json({ success: false, message: "Booking not found" });
  }

  // Verify the booking belongs to this client
  if (booking.client_id !== authUser.user_id) {
    return res.status(403).json({
      success: false,
      message: "You can only review your own bookings",
    });
  }

  // Verify booking is completed
  // Assuming 'COMPLETED' is the status name for completed bookings.
  // We should check the status name from the included status relation or fetch status by ID if needed.
  // Based on bookingController, status_name is used.
  if (booking.status.status_name !== "COMPLETED") {
    return res.status(400).json({
      success: false,
      message: "You can only review completed bookings",
    });
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: { booking_id: Number(booking_id) },
  });

  if (existingReview) {
    return res.status(409).json({
      success: false,
      message: "You have already reviewed this booking",
    });
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      booking_id: Number(booking_id),
      reviewer_id: authUser.user_id,
      photographer_id: booking.photographer_id,
      rating: Number(rating),
      comment: comment || null,
    },
  });

  // Award points to photographer based on rating
  const { awardPoints, POINT_CONFIG } =
    await import("../services/pointsService");

  const ratingNum = Number(rating);
  if (ratingNum === 5) {
    await awardPoints({
      userId: booking.photographer_id,
      points: POINT_CONFIG.REVIEW_5_STAR,
      reason: `5-star review received (Review ID: ${review.review_id})`,
    });
  } else if (ratingNum === 4) {
    await awardPoints({
      userId: booking.photographer_id,
      points: POINT_CONFIG.REVIEW_4_STAR,
      reason: `4-star review received (Review ID: ${review.review_id})`,
    });
  } else if (ratingNum === 3) {
    await awardPoints({
      userId: booking.photographer_id,
      points: POINT_CONFIG.REVIEW_3_STAR,
      reason: `3-star review received (Review ID: ${review.review_id})`,
    });
  } else if (ratingNum <= 2) {
    await awardPoints({
      userId: booking.photographer_id,
      points: POINT_CONFIG.REVIEW_1_2_STAR,
      reason: `Low rating review (${ratingNum} stars, Review ID: ${review.review_id})`,
    });
  }

  // Create Notification for photographer
  const authorName =
    (
      await prisma.user.findUnique({
        where: { user_id: authUser.user_id },
        select: { full_name: true },
      })
    )?.full_name || "A client";
  const notification = await prisma.notification.create({
    data: {
      user_id: booking.photographer_id,
      title: "New Review",
      type: "REVIEW",
      message: `${authorName} gave you a ${rating}-star review for booking #${booking_id}`,
      is_read: false,
    },
  });

  // Emit socket event
  const io = (req as any).io;
  if (io) {
    const normalizedPhotographerId = String(
      booking.photographer_id,
    ).toLowerCase();
    io.to(normalizedPhotographerId).emit("new_notification", {
      ...notification,
      userId: booking.photographer_id,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    data: review,
  });
});

/**
 * GET /api/photographer/reviews
 * Get all reviews for the authenticated photographer
 */
export const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const reviews = await prisma.review.findMany({
    where: {
      photographer_id: authUser.user_id,
    },
    include: {
      reviewer: {
        select: {
          full_name: true,
          profile_image: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return res.json({
    success: true,
    data: reviews,
  });
});

/**
 * POST /api/photographer/reviews/:reviewId/reply
 * Photographer replies to a review
 */
export const replyToReview = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const reviewId = Number(req.params.reviewId);
  if (!Number.isFinite(reviewId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid reviewId" });
  }

  console.log("replyToReview request body:", req.body);
  // Check for common field names for the reply text
  const reply_text =
    req.body.reply_text ||
    req.body.reply ||
    req.body.comment ||
    req.body.message ||
    req.body.text;
  if (!reply_text || typeof reply_text !== "string" || !reply_text.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Reply text is required" });
  }

  // Find the review and verify it belongs to this photographer
  const review = await prisma.review.findFirst({
    where: {
      review_id: reviewId,
      booking: {
        photographer_id: authUser.user_id,
      },
    },
  });

  if (!review) {
    return res
      .status(404)
      .json({ success: false, message: "Review not found or not authorized" });
  }

  const updated = await prisma.review.update({
    where: { review_id: reviewId },
    data: {
      reply_text: reply_text.trim(),
      replied_at: new Date(),
    },
    include: {
      reviewer: {
        select: {
          user_id: true,
          full_name: true,
          profile_image: true,
        },
      },
    },
  });

  // Create Notification for the reviewer
  const authorName =
    (
      await prisma.user.findUnique({
        where: { user_id: authUser.user_id },
        select: { full_name: true },
      })
    )?.full_name || "The photographer";
  const reviewerNotification = await prisma.notification.create({
    data: {
      user_id: review.reviewer_id,
      title: "New Review Reply",
      type: "REVIEW",
      message: `${authorName} replied to your review!`,
      is_read: false,
    },
  });

  // Emit socket event
  const io = (req as any).io;
  if (io) {
    const normalizedReviewerId = String(review.reviewer_id).toLowerCase();
    io.to(normalizedReviewerId).emit("new_notification", {
      ...reviewerNotification,
      userId: review.reviewer_id,
    });
  }

  return res.json({
    success: true,
    message: "Reply submitted successfully",
    data: updated,
  });
});

/**
 * GET /api/photographer/dashboard/stats
 * Get comprehensive stats for the photographer dashboard
 */
export const getDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const photographerId = authUser.user_id;

    // 1. Get Photographer Badge and Basic Info
    const user = await prisma.user.findUnique({
      where: { user_id: photographerId },
      include: {
        rewards: {
          include: {
            badge: true,
          },
        },
      },
    });

    const badge = user?.rewards?.badge?.badge_name || "Standard Photographer";
    const commissionPercentage = user?.rewards?.badge
      ? (user.rewards.badge as any).commission_percentage
      : 10;

    // 2. Aggregate Net Earnings from bookings with successful payments
    const paidBookings = await prisma.booking.findMany({
      where: {
        photographer_id: photographerId,
        payment: {
          status: {
            status_name: "COMPLETED",
          },
        },
      },
      select: {
        amount: true,
        payment: {
          select: {
            photographer_amount: true,
            paid_at: true,
          },
        },
      },
    });

    // Use photographer_amount (net after platform fee)
    const totalEarnings = paidBookings.reduce((sum: number, booking: any) => {
      return (
        sum + Number(booking.payment?.photographer_amount || booking.amount)
      );
    }, 0);

    // Calculate earnings for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = paidBookings.reduce((sum: number, booking: any) => {
      const paidAt = booking.payment?.paid_at
        ? new Date(booking.payment.paid_at)
        : null;
      if (paidAt && paidAt >= startOfMonth) {
        return (
          sum + Number(booking.payment?.photographer_amount || booking.amount)
        );
      }
      return sum;
    }, 0);

    // 3. Average Rating and Total Reviews
    const reviews = await prisma.review.findMany({
      where: { photographer_id: photographerId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
        : 0.0;

    // 4. Upcoming Bookings Count and List
    // We consider PENDING and ACCEPTED bookings as upcoming if the date is in the future
    const now = new Date();
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        photographer_id: photographerId,
        event_date: {
          gte: now,
        },
        status: {
          status_name: {
            in: ["PENDING", "ACCEPTED"],
          },
        },
      },
      include: {
        client: {
          select: {
            full_name: true,
            profile_image: true,
          },
        },
        status: true,
        payment: {
          include: {
            status: true,
          },
        },
      },
      orderBy: {
        event_date: "asc",
      },
      take: 5,
    });

    const upcomingBookingsCount = await prisma.booking.count({
      where: {
        photographer_id: photographerId,
        event_date: {
          gte: now,
        },
        status: {
          status_name: {
            in: ["PENDING", "ACCEPTED"],
          },
        },
      },
    });

    // 5. Recent Reviews
    const recentReviews = await prisma.review.findMany({
      where: { photographer_id: photographerId },
      include: {
        reviewer: {
          select: {
            full_name: true,
            profile_image: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 3,
    });

    // 6. Unread Notifications Count
    const unreadCount = await prisma.notification.count({
      where: {
        user_id: photographerId,
        is_read: false,
      },
    });

    // 7. Formatting for Frontend
    const stats = {
      earnings: totalEarnings,
      upcomingBookingsCount,
      rating: parseFloat(avgRating.toFixed(1)),
      totalReviews,
      badge,
      unreadCount,
      commissionPercentage: Number(commissionPercentage),
    };

    return res.json({
      success: true,
      data: {
        stats,
        upcomingBookings: upcomingBookings.map((b: any) => ({
          id: b.booking_id,
          client: b.client.full_name,
          client_image: b.client.profile_image,
          event: b.event_type || "Photography Session",
          date: b.event_date,
          amount: Number(b.amount),
          status: b.status.status_name,
          payment_status: b.payment?.status?.status_name || "PENDING",
        })),
        recentReviews: recentReviews.map((r: any) => ({
          id: r.review_id,
          client: r.reviewer.full_name,
          client_image: r.reviewer.profile_image,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
        })),
      },
    });
  },
);

/**
 * GET /api/photographer/notifications
 * Get notifications for the authenticated user
 */
export const getNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: authUser.user_id },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    return res.json({
      success: true,
      data: notifications,
    });
  },
);

/**
 * PATCH /api/photographer/notifications/:notificationId/read
 * Mark a notification as read
 */
export const markNotificationAsRead = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const notificationId = Number(req.params.notificationId);
    if (isNaN(notificationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notificationId" });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        notification_id: notificationId,
        user_id: authUser.user_id,
      },
    });

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { notification_id: notificationId },
      data: { is_read: true },
    });

    return res.json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  },
);

/**
 * GET /api/photographer/earnings
 * Get detailed earnings history for the photographer
 */
export const getEarnings = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      photographer_id: authUser.user_id,
      payment: {
        status: {
          status_name: "COMPLETED",
        },
      },
    },
    include: {
      client: {
        select: {
          full_name: true,
        },
      },
      package: true,
      payment: {
        include: {
          status: true,
        },
      },
    },
    orderBy: {
      event_date: "desc",
    },
  });

  const formattedEarnings = bookings.map((b: any) => ({
    id: b.booking_id,
    amount: Number(b.amount),
    commission_amount: b.payment?.commission_amount
      ? Number(b.payment.commission_amount)
      : 0,
    photographer_amount: b.payment?.photographer_amount
      ? Number(b.payment.photographer_amount)
      : 0,
    platform_fee_percentage: b.payment?.platform_fee_percentage || 0,
    date: b.event_date,
    client: b.client.full_name,
    package: b.package.name,
    payment_status: b.payment?.status?.status_name || "PENDING",
  }));

  const total = formattedEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);

  return res.json({
    success: true,
    data: {
      total,
      history: formattedEarnings,
    },
  });
});

/**
 * GET /api/photographer/analytics
 * Get analytics for the photographer
 */
export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const photographerId = authUser.user_id;

  // 1. Bookings by Status
  const bookingStats = await prisma.booking.groupBy({
    by: ["status_id"],
    where: { photographer_id: photographerId },
    _count: { booking_id: true },
  });

  // Map status names
  const statuses = await prisma.bookingStatus.findMany();
  const statusLabels = statuses.reduce((map: any, s: any) => {
    map[s.status_id] = s.status_name;
    return map;
  }, {});

  const bookingDistribution = bookingStats.map((s: any) => ({
    status: statusLabels[s.status_id],
    count: s._count.booking_id,
  }));

  // 2. Earnings by Month (Last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const paidBookings = await prisma.booking.findMany({
    where: {
      photographer_id: photographerId,
      payment: {
        status: { status_name: "COMPLETED" },
        paid_at: { gte: sixMonthsAgo },
      },
    },
    select: {
      amount: true,
      payment: {
        select: {
          photographer_amount: true,
          paid_at: true,
        },
      },
    },
  });

  const monthlyEarnings = paidBookings.reduce((acc: any, b: any) => {
    const paidAt = b.payment?.paid_at
      ? new Date(b.payment.paid_at)
      : new Date();
    const monthStr = paidAt.toLocaleString("default", {
      month: "short",
      year: "2-digit",
    });
    const amount = b.payment?.photographer_amount
      ? Number(b.payment.photographer_amount)
      : Number(b.amount);
    acc[monthStr] = (acc[monthStr] || 0) + amount;
    return acc;
  }, {});

  const earningsChart = Object.entries(monthlyEarnings).map(
    ([month, amount]) => ({
      month,
      amount,
    }),
  );

  // 3. Top Packages
  const topPackages = await prisma.booking.groupBy({
    by: ["package_id"],
    where: { photographer_id: photographerId },
    _count: { booking_id: true },
    orderBy: { _count: { booking_id: "desc" } },
    take: 5,
  });

  const packageIds = topPackages.map((p: any) => p.package_id);
  const packageDetails = await prisma.package.findMany({
    where: { package_id: { in: packageIds } },
  });

  const packageStats = topPackages.map((p: any) => {
    const detail = packageDetails.find((d: any) => d.package_id === p.package_id);
    return {
      name: detail?.name || "Unknown",
      count: p._count.booking_id,
    };
  });

  return res.json({
    success: true,
    data: {
      bookingDistribution,
      earningsChart,
      packageStats,
    },
  });
});

/**
 * Toggle save on a photographer profile for the client.
 */
export const togglePhotographerSave = catchAsync(
  async (req: Request, res: Response) => {
    const photographerId = req.params.photographerId;
    const clientId = (req as any).user?.user_id;

    if (!clientId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!photographerId) {
      return res
        .status(400)
        .json({ success: false, message: "Photographer ID is required" });
    }

    // Check if user is trying to save themselves
    const photographerIdNum = String(photographerId);
    if (clientId === photographerIdNum) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot save your own profile" });
    }

    // Check if already saved
    const existingSave = await prisma.photographerSave.findUnique({
      where: {
        photographer_id_client_id: {
          photographer_id: photographerIdNum,
          client_id: clientId,
        },
      },
    });

    const { handlePhotographerSave } =
      await import("../services/pointsService");

    if (existingSave) {
      // Unsave
      await prisma.photographerSave.delete({
        where: {
          photographer_id_client_id: {
            photographer_id: photographerIdNum,
            client_id: clientId,
          },
        },
      });

      return res.json({
        success: true,
        message: "Photographer removed from saved list",
        isSaved: false,
      });
    } else {
      // Save
      await handlePhotographerSave(photographerIdNum, clientId, true);

      return res.json({
        success: true,
        message: "Photographer added to saved list",
        isSaved: true,
      });
    }
  },
);

/**
 * GET /api/client/favorites
 * Get all photographers saved by the current client.
 */
export const getFavoritePhotographers = catchAsync(
  async (req: Request, res: Response) => {
    const clientId = (req as any).user?.user_id;

    if (!clientId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const saves = await prisma.photographerSave.findMany({
      where: { client_id: clientId },
      include: {
        photographer: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_image: true,
            specialization: true,
            location: true,
            kyc_verification: {
              select: {
                status: true,
              },
            },
            reviews_received: {
              select: {
                rating: true,
              },
            },
            rewards: {
              include: {
                badge: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const results = await Promise.all(
      saves.map(async (save: any) => {
        const photographer = save.photographer;
        const avgRating =
          photographer.reviews_received.length > 0
            ? photographer.reviews_received.reduce(
                (sum: number, r: any) => sum + r.rating,
                0,
              ) / photographer.reviews_received.length
            : 5.0; // Default to 5.0 if no reviews

        const points = photographer.rewards?.total_points || 0;
        
        // Calculate rank
        const photographersWithMorePoints = await prisma.reward.count({
          where: {
            total_points: {
              gt: points,
            },
          },
        });
        const rank = photographersWithMorePoints + 1;

        return {
          user_id: photographer.user_id,
          full_name: photographer.full_name,
          specialization: photographer.specialization,
          avg_rating: avgRating,
          reviews_count: photographer.reviews_received.length,
          location: photographer.location,
          kyc_verified: photographer.kyc_verification?.status === "APPROVED",
          profile_image: photographer.profile_image,
          favorited_at: save.created_at,
          rank: rank,
          badge: pointsService.getBadgeTier(points),
        };
      }),
    );

    return res.json({
      success: true,
      data: results,
    });
  },
);

/**
 * GET /api/client/favorites/ids
 * Get only the IDs of psychologists saved by the current user.
 */
export const getFavoritePhotographerIds = catchAsync(
  async (req: Request, res: Response) => {
    const clientId = (req as any).user?.user_id;

    if (!clientId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const saves = await prisma.photographerSave.findMany({
      where: { client_id: clientId },
      select: { photographer_id: true },
    });

    const favoriteIds = saves.map((s: any) => s.photographer_id);

    return res.json({
      success: true,
      data: { favoriteIds },
    });
  },
);
