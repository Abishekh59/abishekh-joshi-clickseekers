import type { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';

/**
 * GET /api/photographer/feed
 * Fetches portfolio images with associated photographer and category data.
 * This is used for the Instagram-style shuffled grid on the Client Dashboard.
 */
export const getDashboardFeed = catchAsync(async (req: Request, res: Response) => {
    const images = await prisma.portfolioImage.findMany({
        include: {
            portfolio: {
                include: {
                    category: true,
                    user: {
                        select: {
                            user_id: true,
                            full_name: true,
                            profile_image: true,
                            role: true
                        }
                    }
                }
            }
        },
        orderBy: {
            image_id: 'desc'
        },
        take: 50 // Limit to 50 for the feed
    });

    // Shuffle the images for visual variety
    const shuffledImages = [...images];
    for (let i = shuffledImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }

    return res.json({
        success: true,
        data: shuffledImages
    });
});

/**
 * PATCH /api/photographer/portfolio/image/:imageId/view
 * Atomic increment of the views_count for a specific image.
 */
export const incrementImageView = catchAsync(async (req: Request, res: Response) => {
    const imageId = Number(req.params.imageId);

    if (isNaN(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    const updatedImage = await prisma.portfolioImage.update({
        where: { image_id: imageId },
        data: {
            views_count: {
                increment: 1
            }
        }
    });

    return res.json({
        success: true,
        message: 'View count incremented',
        data: {
            image_id: updatedImage.image_id,
            views_count: updatedImage.views_count
        }
    });
});

/**
 * PATCH /api/photographer/portfolio/image/:imageId/like
 * Atomic increment of the likes_count for a specific image.
 */
export const incrementImageLike = catchAsync(async (req: Request, res: Response) => {
    const imageId = Number(req.params.imageId);

    if (isNaN(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    const updatedImage = await prisma.portfolioImage.update({
        where: { image_id: imageId },
        data: {
            likes_count: {
                increment: 1
            }
        }
    });

    return res.json({
        success: true,
        message: 'Like count incremented',
        data: {
            image_id: updatedImage.image_id,
            likes_count: updatedImage.likes_count
        }
    });
});
