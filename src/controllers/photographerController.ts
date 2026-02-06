import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';

// GET /api/photographers/:photographerId
// Get a photographer by id with their details and recent portfolio images
export const getPhotographerByIdWithRecentPortfolios = catchAsync(async (req: Request, res: Response) => {
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
          badge: true
        }
      },
      reviews_received: {
        include: {
          reviewer: {
            select: {
              full_name: true,
              profile_image: true
            }
          }
        }
      }
    },
  });

  if (!photographer || photographer.role !== 'PHOTOGRAPHER') {
    return res.status(404).json({ success: false, message: 'Photographer not found' });
  }

  // Calculate total completed bookings
  const totalBookings = await prisma.booking.count({
    where: {
      photographer_id: photographerId,
      status: {
        status_name: 'COMPLETED'
      }
    }
  });

  // Calculate Rank base on rewards.total_points
  let rank = "N/A";
  let points = photographer.rewards?.total_points || 0;

  if (photographer.rewards) {
    const photographersWithMorePoints = await prisma.reward.count({
      where: {
        total_points: {
          gt: photographer.rewards.total_points
        }
      }
    });
    rank = `#${photographersWithMorePoints + 1}`;
  }

  const portfolios = await prisma.portfolio.findMany({
    where: { user_id: photographer.user_id },
    select: { portfolio_id: true },
  });
  const portfolioIds = portfolios.map((p) => p.portfolio_id);

  const recentImages = portfolioIds.length > 0
    ? await prisma.portfolioImage.findMany({
      where: { portfolio_id: { in: portfolioIds } },
      orderBy: { image_id: 'desc' },
      take: RECENT_IMAGE_COUNT,
    })
    : [];

  return res.json({
    success: true,
    data: {
      ...photographer,
      reviews: photographer.reviews_received, // Map to 'reviews' for frontend compatibility
      recent_portfolio_images: recentImages,
      total_bookings: totalBookings,
      rank: rank,
      points: points,
      badge: photographer.rewards?.badge?.badge_name || "Standard Photographer"
    },
  });
});

const UPLOAD_CATEGORIES = [
  'Portrait',
  'Event',
  'Product',
  'Wedding',
  'Aerial',
  'Fashion',
  'Travel',
  'Landscape',
  'Culture',
  'Nature',
  'Wildlife',
  'Sports',
  'Family',
  'Newborn',
  'Commercial',
  'Fine Art',
  'Real Estate',
  'Other',
] as const;

type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

const PORTFOLIO_CATEGORY_NAMES = [
  'WEDDING',
  'EVENT',
  'PRODUCT',
  'PORTRAIT',
  'AERIAL',
  'FASHION',
  'TRAVEL',
  'LANDSCAPE',
  'CULTURE',
  'NATURE',
  'WILDLIFE',
  'SPORTS',
  'FAMILY',
  'NEWBORN',
  'COMMERCIAL',
  'FINE_ART',
  'REAL_ESTATE',
  'OTHER',
] as const;

type PortfolioCategoryName = (typeof PORTFOLIO_CATEGORY_NAMES)[number];

const CATEGORY_TO_API: Record<UploadCategory, PortfolioCategoryName> = {
  Wedding: 'WEDDING',
  Event: 'EVENT',
  Product: 'PRODUCT',
  Portrait: 'PORTRAIT',
  Aerial: 'AERIAL',
  Fashion: 'FASHION',
  Travel: 'TRAVEL',
  Landscape: 'LANDSCAPE',
  Culture: 'CULTURE',
  Nature: 'NATURE',
  Wildlife: 'WILDLIFE',
  Sports: 'SPORTS',
  Family: 'FAMILY',
  Newborn: 'NEWBORN',
  Commercial: 'COMMERCIAL',
  'Fine Art': 'FINE_ART',
  'Real Estate': 'REAL_ESTATE',
  Other: 'OTHER',
};

const PORTFOLIO_CATEGORY_SET = new Set<string>(PORTFOLIO_CATEGORY_NAMES);

const normalizeCategoryKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const LABEL_TO_CANONICAL = (() => {
  const map = new Map<string, PortfolioCategoryName>();
  for (const label of UPLOAD_CATEGORIES) {
    map.set(normalizeCategoryKey(label), CATEGORY_TO_API[label]);
  }
  return map;
})();

const categoryAliasesForDb = (category: PortfolioCategoryName): string[] => {
  // Backwards-compat for any legacy DB values that used spaces instead of underscores.
  const spaced = category.replace(/_/g, ' ');
  return spaced === category ? [category] : [category, spaced];
};

const normalizeCategoryName = (value: unknown): PortfolioCategoryName | null => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  const fromLabel = LABEL_TO_CANONICAL.get(normalizeCategoryKey(raw));
  if (fromLabel) return fromLabel;

  // Also accept canonical API names, case-insensitively, with spaces/hyphens treated as underscores.
  const enumCandidate = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if (PORTFOLIO_CATEGORY_SET.has(enumCandidate)) return enumCandidate as PortfolioCategoryName;

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

const getOrCreatePortfolioForUserAndCategory = async (user_id: string, category_id: number, category_name: string) => {
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

const imageUrlToAbsolutePath = (image_url: string): string | null => {
  // We only delete files we created under /assets
  if (!image_url.startsWith('/assets/')) return null;

  const relative = image_url.replace(/^\//, '');
  const absolute = path.join(process.cwd(), relative);

  // Prevent path traversal outside /assets
  const assetsRoot = path.join(process.cwd(), 'assets') + path.sep;
  if (!absolute.startsWith(assetsRoot)) return null;

  return absolute;
};

// POST /api/photographer/portfolio/images
// multipart/form-data: image=<file>, category=Portrait|Event|...|Fine Art|Real Estate
export const addPortfolioImage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : null;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Title is required',
    });
  }

  const category = normalizeCategoryName(req.body?.category);
  if (!category) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Use one of: ${UPLOAD_CATEGORIES.join(', ')}`,
    });
  }

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'Image file is required (field name: image)' });
  }

  const cat = await getOrCreateCategory(category);
  const portfolio = await getOrCreatePortfolioForUserAndCategory(authUser.user_id, cat.category_id, cat.category_name);

  // Store relative URL for static serving
  const image_url = `/assets/portfolio/${file.filename}`;

  const created = await prisma.portfolioImage.create({
    data: {
      portfolio_id: portfolio.portfolio_id,
      title,
      description,
      image_url,
      mime_type: file.mimetype,
      original_name: file.originalname,
      // We no longer need to store big blobs in the DB if we use disk storage
    },
    include: {
      portfolio: {
        include: {
          category: true,
        },
      },
    },
  });

  // Emit socket event for real-time updates
  if ((req as any).io) {
    (req as any).io.emit('photographer_updated', {
      photographerId: authUser.user_id,
      type: 'portfolio_update'
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Portfolio image uploaded successfully',
    data: created,
  });
});

// GET /api/photographer/portfolio/images?category=wedding|event|product
export const listMyPortfolioImages = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const category = req.query.category ? normalizeCategoryName(req.query.category) : null;
  if (req.query.category && !category) {
    return res.status(400).json({
      success: false,
      message: `Invalid category filter. Use one of: ${UPLOAD_CATEGORIES.join(', ')}`,
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
    orderBy: { image_id: 'desc' },
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
    message: 'Portfolio images fetched successfully',
    data: images,
  });
});

// PATCH /api/photographer/portfolio/images/:imageId
// body: { category?: wedding|event|product, title?: string, description?: string }
export const updatePortfolioImage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const imageId = Number(req.params.imageId);
  if (!Number.isFinite(imageId)) {
    return res.status(400).json({ success: false, message: 'Invalid imageId' });
  }

  const category = req.body?.category ? normalizeCategoryName(req.body.category) : undefined;
  if (req.body?.category && category === null) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Use one of: ${UPLOAD_CATEGORIES.join(', ')}`,
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
    return res.status(404).json({ success: false, message: 'Portfolio image not found' });
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : image.title;
  const description = req.body?.description !== undefined ? (typeof req.body?.description === 'string' ? req.body.description.trim() : null) : image.description;
  const categoryStr = req.body?.category ? normalizeCategoryName(req.body.category) : null;

  let portfolio_id = image.portfolio_id;
  if (categoryStr) {
    const cat = await getOrCreateCategory(categoryStr);
    const portfolio = await getOrCreatePortfolioForUserAndCategory(authUser.user_id, cat.category_id, cat.category_name);
    portfolio_id = portfolio.portfolio_id;
  }

  const updated = await prisma.portfolioImage.update({
    where: { image_id: imageId },
    data: {
      portfolio_id,
      title,
      description
    },
    include: {
      portfolio: {
        include: { category: true },
      },
    },
  });

  // Emit socket event for real-time updates
  if ((req as any).io) {
    (req as any).io.emit('photographer_updated', {
      photographerId: authUser.user_id,
      type: 'portfolio_update'
    });
  }

  return res.json({
    success: true,
    message: 'Portfolio image category updated successfully',
    data: updated,
  });
});

// DELETE /api/photographer/portfolio/images/:imageId
export const deletePortfolioImage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const imageId = Number(req.params.imageId);
  if (!Number.isFinite(imageId)) {
    return res.status(400).json({ success: false, message: 'Invalid imageId' });
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
    return res.status(404).json({ success: false, message: 'Portfolio image not found' });
  }

  await prisma.portfolioImage.delete({ where: { image_id: imageId } });

  if (image.image_url) {
    const abs = imageUrlToAbsolutePath(image.image_url);
    if (abs) safeUnlinkIfExists(abs);
  }

  // Emit socket event for real-time updates
  if ((req as any).io) {
    (req as any).io.emit('photographer_updated', {
      photographerId: authUser.user_id,
      type: 'portfolio_update'
    });
  }

  return res.json({
    success: true,
    message: 'Portfolio image deleted successfully',
  });
});

// GET /api/photographers/:photographerId/portfolio/images?category=wedding|event|product
export const listPhotographerPortfolioImagesPublic = catchAsync(async (req: Request, res: Response) => {
  const photographerId = req.params.photographerId;

  const category = req.query.category ? normalizeCategoryName(req.query.category) : null;
  if (req.query.category && !category) {
    return res.status(400).json({
      success: false,
      message: `Invalid category filter. Use one of: ${UPLOAD_CATEGORIES.join(', ')}`,
    });
  }

  const photographer = await prisma.user.findUnique({
    where: { user_id: photographerId },
    select: { user_id: true, full_name: true, role: true, profile_image: true, bio: true, specialization: true },
  });

  if (!photographer || photographer.role !== 'PHOTOGRAPHER') {
    return res.status(404).json({ success: false, message: 'Photographer not found' });
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
    orderBy: { image_id: 'desc' },
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
    message: 'Photographer portfolio images fetched successfully',
    data: {
      photographer,
      images,
    },
  });
});

// GET /api/photographer/portfolio/image/:imageId
export const getPortfolioImageBinary = catchAsync(async (req: Request, res: Response) => {
  const imageId = Number(req.params.imageId);
  if (isNaN(imageId)) return res.status(400).json({ success: false, message: 'Invalid imageId' });
  const image = await prisma.portfolioImage.findUnique({ where: { image_id: imageId } });
  if (!image || !image.image_data) return res.status(404).json({ success: false, message: 'Image not found' });
  res.set('Content-Type', image.mime_type || 'image/jpeg');
  res.send(Buffer.from(image.image_data));
});

// GET /api/photographers
// List all photographers with their details and recent portfolio images
export const listAllPhotographersWithRecentPortfolios = catchAsync(async (req: Request, res: Response) => {
  // You can adjust the number of recent images per photographer here
  const RECENT_IMAGE_COUNT = 3;

  // Get all photographers
  const photographers = await prisma.user.findMany({
    where: { role: 'PHOTOGRAPHER' },
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
      kyc_verified: true,
      kyc_verification: {
        select: {
          status: true
        }
      },
      reviews_received: true,
    },
  });

  // For each photographer, get their recent portfolio images and calculate aggregate stats
  const results = await Promise.all(
    photographers.map(async (photographer) => {
      // Get all images for this photographer across all portfolios
      const allImages = await prisma.portfolioImage.findMany({
        where: { portfolio: { user_id: photographer.user_id } },
        select: { likes_count: true, views_count: true }
      });

      const totalLikes = allImages.reduce((sum, img) => sum + img.likes_count, 0);
      const totalViews = allImages.reduce((sum, img) => sum + img.views_count, 0);

      const avgRating = photographer.reviews_received.length > 0
        ? photographer.reviews_received.reduce((sum, r) => sum + r.rating, 0) / photographer.reviews_received.length
        : 5.0; // Default to 5.0 if no reviews

      // Find all portfolios for this photographer
      const portfolios = await prisma.portfolio.findMany({
        where: { user_id: photographer.user_id },
        select: { portfolio_id: true },
      });
      const portfolioIds = portfolios.map((p) => p.portfolio_id);

      // Get recent images
      const recentImages = portfolioIds.length > 0
        ? await prisma.portfolioImage.findMany({
          where: { portfolio_id: { in: portfolioIds } },
          orderBy: { image_id: 'desc' },
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

      return {
        ...photographer,
        total_likes: totalLikes,
        total_views: totalViews,
        avg_rating: avgRating,
        recent_portfolio_images: recentImages,
      };
    })
  );

  return res.json({
    success: true,
    data: results,
  });
});

/**
 * GET /api/photographer/top
 * Fetches a list of photographers for the dashboard stories bar.
 */
export const getTopPhotographers = catchAsync(async (req: Request, res: Response) => {
  const photographers = await prisma.user.findMany({
    where: { role: 'PHOTOGRAPHER' },
    select: {
      user_id: true,
      full_name: true,
      profile_image: true,
    },
    take: 15
  });

  return res.json({
    success: true,
    data: photographers
  });
});

/**
   * POST /api/photographer/review
   * Submit a review for a completed booking
   * Body: { booking_id, rating, comment }
   */
export const submitReview = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Ensure only clients can submit reviews (though route middleware also checks this)
  if (authUser.role !== 'CLIENT') {
    return res.status(403).json({ success: false, message: 'Only clients can submit reviews' });
  }

  console.log('submitReview request body:', req.body);
  const { booking_id, rating } = req.body;
  // Check for common field names for the comment
  const comment = req.body.comment || req.body.review || req.body.message || req.body.description || null;

  if (!booking_id || !rating) {
    return res.status(400).json({ success: false, message: 'booking_id and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  // Find the booking
  const booking = await prisma.booking.findUnique({
    where: { booking_id: Number(booking_id) },
    include: { status: true }
  });

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  // Verify the booking belongs to this client
  if (booking.client_id !== authUser.user_id) {
    return res.status(403).json({ success: false, message: 'You can only review your own bookings' });
  }

  // Verify booking is completed
  // Assuming 'COMPLETED' is the status name for completed bookings.
  // We should check the status name from the included status relation or fetch status by ID if needed.
  // Based on bookingController, status_name is used.
  if (booking.status.status_name !== 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'You can only review completed bookings' });
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: { booking_id: Number(booking_id) }
  });

  if (existingReview) {
    return res.status(409).json({ success: false, message: 'You have already reviewed this booking' });
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      booking_id: Number(booking_id),
      reviewer_id: authUser.user_id,
      photographer_id: booking.photographer_id,
      rating: Number(rating),
      comment: comment || null
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: review
  });
});

/**
 * GET /api/photographer/reviews
 * Get all reviews for the authenticated photographer
 */
export const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const reviews = await prisma.review.findMany({
    where: {
      photographer_id: authUser.user_id
    },
    include: {
      reviewer: {
        select: {
          full_name: true,
          profile_image: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return res.json({
    success: true,
    data: reviews
  });
});

/**
 * POST /api/photographer/reviews/:reviewId/reply
 * Photographer replies to a review
 */
export const replyToReview = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const reviewId = Number(req.params.reviewId);
  if (!Number.isFinite(reviewId)) {
    return res.status(400).json({ success: false, message: 'Invalid reviewId' });
  }

  console.log('replyToReview request body:', req.body);
  // Check for common field names for the reply text
  const reply_text = req.body.reply_text || req.body.reply || req.body.comment || req.body.message || req.body.text;
  if (!reply_text || typeof reply_text !== 'string' || !reply_text.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text is required' });
  }

  // Find the review and verify it belongs to this photographer
  const review = await prisma.review.findFirst({
    where: {
      review_id: reviewId,
      booking: {
        photographer_id: authUser.user_id
      }
    }
  });

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found or not authorized' });
  }

  const updated = await prisma.review.update({
    where: { review_id: reviewId },
    data: {
      reply_text: reply_text.trim(),
      replied_at: new Date()
    },
    include: {
      reviewer: {
        select: {
          full_name: true,
          profile_image: true
        }
      }
    }
  });

  return res.json({
    success: true,
    message: 'Reply submitted successfully',
    data: updated
  });
});

/**
 * GET /api/photographer/dashboard/stats
 * Get comprehensive stats for the photographer dashboard
 */
export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const photographerId = authUser.user_id;

  // 1. Get Photographer Badge and Basic Info
  const user = await prisma.user.findUnique({
    where: { user_id: photographerId },
    include: {
      rewards: {
        include: {
          badge: true
        }
      }
    }
  });

  const badge = user?.rewards?.badge?.badge_name || "Standard Photographer";

  // 2. Aggregate Earnings from COMPLETED bookings
  const completedBookings = await prisma.booking.findMany({
    where: {
      photographer_id: photographerId,
      status: {
        status_name: 'COMPLETED'
      }
    },
    select: {
      amount: true
    }
  });

  const totalEarnings = completedBookings.reduce((sum, booking) => sum + Number(booking.amount), 0);

  // 3. Average Rating and Total Reviews
  const reviews = await prisma.review.findMany({
    where: { photographer_id: photographerId },
    select: { rating: true }
  });

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 5.0;

  // 4. Upcoming Bookings Count and List
  // We consider PENDING and ACCEPTED bookings as upcoming if the date is in the future
  const now = new Date();
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      photographer_id: photographerId,
      event_date: {
        gte: now
      },
      status: {
        status_name: {
          in: ['PENDING', 'ACCEPTED']
        }
      }
    },
    include: {
      client: {
        select: {
          full_name: true,
          profile_image: true
        }
      },
      status: true
    },
    orderBy: {
      event_date: 'asc'
    },
    take: 5
  });

  const upcomingBookingsCount = await prisma.booking.count({
    where: {
      photographer_id: photographerId,
      event_date: {
        gte: now
      },
      status: {
        status_name: {
          in: ['PENDING', 'ACCEPTED']
        }
      }
    }
  });

  // 5. Recent Reviews
  const recentReviews = await prisma.review.findMany({
    where: { photographer_id: photographerId },
    include: {
      reviewer: {
        select: {
          full_name: true,
          profile_image: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 3
  });

  // 6. Unread Notifications Count
  const unreadCount = await prisma.notification.count({
    where: {
      user_id: photographerId,
      is_read: false
    }
  });

  // 7. Formatting for Frontend
  const stats = {
    earnings: totalEarnings,
    upcomingBookingsCount,
    rating: parseFloat(avgRating.toFixed(1)),
    totalReviews,
    badge,
    unreadCount
  };

  return res.json({
    success: true,
    data: {
      stats,
      upcomingBookings: upcomingBookings.map(b => ({
        id: b.booking_id,
        client: b.client.full_name,
        client_image: b.client.profile_image,
        event: b.event_type || 'Photography Session',
        date: b.event_date,
        amount: Number(b.amount),
        status: b.status.status_name
      })),
      recentReviews: recentReviews.map(r => ({
        id: r.review_id,
        client: r.reviewer.full_name,
        client_image: r.reviewer.profile_image,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at
      }))
    }
  });
});

/**
 * GET /api/photographer/notifications
 * Get notifications for the authenticated user
 */
export const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const notifications = await prisma.notification.findMany({
    where: { user_id: authUser.user_id },
    orderBy: { created_at: 'desc' },
    take: 50
  });

  return res.json({
    success: true,
    data: notifications
  });
});

/**
 * PATCH /api/photographer/notifications/:notificationId/read
 * Mark a notification as read
 */
export const markNotificationAsRead = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const notificationId = Number(req.params.notificationId);
  if (isNaN(notificationId)) {
    return res.status(400).json({ success: false, message: 'Invalid notificationId' });
  }

  const notification = await prisma.notification.findFirst({
    where: {
      notification_id: notificationId,
      user_id: authUser.user_id
    }
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  const updated = await prisma.notification.update({
    where: { notification_id: notificationId },
    data: { is_read: true }
  });

  return res.json({
    success: true,
    message: 'Notification marked as read',
    data: updated
  });
});

/**
 * GET /api/photographer/earnings
 * Get detailed earnings history for the photographer
 */
export const getEarnings = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      photographer_id: authUser.user_id,
      status: {
        status_name: 'COMPLETED'
      }
    },
    include: {
      client: {
        select: {
          full_name: true
        }
      },
      package: true
    },
    orderBy: {
      event_date: 'desc'
    }
  });

  const formattedEarnings = bookings.map(b => ({
    id: b.booking_id,
    amount: Number(b.amount),
    date: b.event_date,
    client: b.client.full_name,
    package: b.package.name
  }));

  const total = formattedEarnings.reduce((sum, e) => sum + e.amount, 0);

  return res.json({
    success: true,
    data: {
      total,
      history: formattedEarnings
    }
  });
});

/**
 * GET /api/photographer/analytics
 * Get analytics for the photographer
 */
export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const photographerId = authUser.user_id;

  // 1. Bookings by Status
  const bookingStats = await prisma.booking.groupBy({
    by: ['status_id'],
    where: { photographer_id: photographerId },
    _count: { booking_id: true }
  });

  // Map status names
  const statuses = await prisma.bookingStatus.findMany();
  const statusLabels = statuses.reduce((map: any, s) => {
    map[s.status_id] = s.status_name;
    return map;
  }, {});

  const bookingDistribution = bookingStats.map(s => ({
    status: statusLabels[s.status_id],
    count: s._count.booking_id
  }));

  // 2. Earnings by Month (Last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const completedBookings = await prisma.booking.findMany({
    where: {
      photographer_id: photographerId,
      status: { status_name: 'COMPLETED' },
      event_date: { gte: sixMonthsAgo }
    },
    select: {
      amount: true,
      event_date: true
    }
  });

  const monthlyEarnings = completedBookings.reduce((acc: any, b) => {
    const monthStr = b.event_date.toLocaleString('default', { month: 'short', year: '2-digit' });
    acc[monthStr] = (acc[monthStr] || 0) + Number(b.amount);
    return acc;
  }, {});

  const earningsChart = Object.entries(monthlyEarnings).map(([month, amount]) => ({
    month,
    amount
  }));

  // 3. Top Packages
  const topPackages = await prisma.booking.groupBy({
    by: ['package_id'],
    where: { photographer_id: photographerId },
    _count: { booking_id: true },
    orderBy: { _count: { booking_id: 'desc' } },
    take: 5
  });

  const packageIds = topPackages.map(p => p.package_id);
  const packageDetails = await prisma.package.findMany({
    where: { package_id: { in: packageIds } }
  });

  const packageStats = topPackages.map(p => {
    const detail = packageDetails.find(d => d.package_id === p.package_id);
    return {
      name: detail?.name || 'Unknown',
      count: p._count.booking_id
    };
  });

  return res.json({
    success: true,
    data: {
      bookingDistribution,
      earningsChart,
      packageStats
    }
  });
});