import type { Request, Response } from 'express';
import prisma from '../model/index';
import * as pointsService from '../services/pointsService';
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

    // For each image, calculate the photographer's rank and badge
    const imagesWithStats = await Promise.all(images.map(async (image) => {
        const photographer = image.portfolio?.user;
        if (!photographer) return image;

        // Get reward info for points
        const reward = await prisma.reward.findUnique({
            where: { user_id: photographer.user_id },
            include: { badge: true }
        });

        const points = reward?.total_points || 0;

        // Calculate rank
        const photographersWithMorePoints = await prisma.reward.count({
            where: {
                total_points: {
                    gt: points
                },
                user: {
                    role: "PHOTOGRAPHER",
                    status: "ACTIVE"
                }
            }
        });
        const rank = photographersWithMorePoints + 1;

        return {
            ...image,
            portfolio: {
                ...image.portfolio,
                user: {
                    ...photographer,
                    rank: rank,
                    points: points,
                    badge: pointsService.getBadgeTier(points)
                }
            }
        };
    }));

    // Shuffle the images for visual variety
    const shuffledImages = [...imagesWithStats];
    for (let i = shuffledImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }

    const enrichImageWithUrl = (image: any) => ({
        ...image,
        image_url: `/api/photographer/portfolio/image/${image.image_id}`
    });

    return res.json({
        success: true,
        data: shuffledImages.map(enrichImageWithUrl)
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
 * Toggle like on a portfolio image and track per user.
 * Awards points to the photographer when someone likes their photo.
 */
export const incrementImageLike = catchAsync(async (req: Request, res: Response) => {
    const imageId = Number(req.params.imageId);
    const userId = (req as any).user?.user_id; // From auth middleware

    if (isNaN(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check if user already liked this image
    const existingLike = await prisma.photoLike.findUnique({
        where: {
            image_id_user_id: {
                image_id: imageId,
                user_id: userId
            }
        }
    });

    if (existingLike) {
        // Unlike - remove the like record and decrement count
        await prisma.photoLike.delete({
            where: {
                like_id: existingLike.like_id
            }
        });

        const updatedImage = await prisma.portfolioImage.update({
            where: { image_id: imageId },
            data: {
                likes_count: {
                    decrement: 1
                }
            },
            include: {
                portfolio: {
                    select: {
                        user_id: true
                    }
                }
            }
        });

        // Deduct points
        const { handlePhotoLike, POINT_CONFIG } = await import('../services/pointsService');
        const photographerId = updatedImage.portfolio.user_id;

        await handlePhotoLike(imageId, userId, photographerId, false);

        return res.json({
            success: true,
            message: 'Image unliked',
            data: {
                image_id: updatedImage.image_id,
                likes_count: updatedImage.likes_count,
                isLiked: false
            }
        });
    } else {
        // Like - create like record and increment count
        await prisma.photoLike.create({
            data: {
                image_id: imageId,
                user_id: userId
            }
        });

        const updatedImage = await prisma.portfolioImage.update({
            where: { image_id: imageId },
            data: {
                likes_count: {
                    increment: 1
                }
            },
            include: {
                portfolio: {
                    select: {
                        user_id: true
                    }
                }
            }
        });

        // Award points using pointsService
        const { handlePhotoLike, POINT_CONFIG } = await import('../services/pointsService');
        const photographerId = updatedImage.portfolio.user_id;

        await handlePhotoLike(imageId, userId, photographerId, true);

        // Create Notification
        const sender = await prisma.user.findUnique({ where: { user_id: userId }, select: { full_name: true } });
        const notification = await prisma.notification.create({
            data: {
                user_id: photographerId,
                title: 'New Like',
                type: 'LIKE',
                message: `${sender?.full_name || 'Someone'} liked your photo!`,
                is_read: false
            }
        });

        // Emit socket event
        const io = (req as any).io;
        if (io) {
            const normalizedPhotographerId = String(photographerId).toLowerCase();
            io.to(normalizedPhotographerId).emit('new_notification', {
                ...notification,
                userId: photographerId
            });
        }
        return res.json({
            success: true,
            message: 'Image liked',
            data: {
                image_id: updatedImage.image_id,
                likes_count: updatedImage.likes_count,
                isLiked: true
            }
        });
    }
});

/**
 * GET /api/photographer/my-likes
 * Get all image IDs that the current user has liked.
 * Used to restore like state when the dashboard loads.
 */
export const getUserLikes = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.user_id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const likes = await prisma.photoLike.findMany({
        where: {
            user_id: userId
        },
        select: {
            image_id: true
        }
    });

    const imageIds = likes.map(like => like.image_id);

    return res.json({
        success: true,
        data: {
            likedImageIds: imageIds
        }
    });
});

/**
 * PATCH /api/photographer/portfolio/image/:imageId/save
 * Toggle save on a portfolio image for the client.
 * Awards points to the photographer when someone saves their photo.
 */
export const toggleImageSave = catchAsync(async (req: Request, res: Response) => {
    const imageId = Number(req.params.imageId);
    const userId = (req as any).user?.user_id;

    if (isNaN(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check if user already saved this image
    const existingSave = await prisma.photoSave.findUnique({
        where: {
            image_id_user_id: {
                image_id: imageId,
                user_id: userId
            }
        }
    });

    const { handlePhotoSave } = await import('../services/pointsService');

    if (existingSave) {
        // Unsave
        await prisma.photoSave.delete({
            where: {
                save_id: existingSave.save_id
            }
        });

        // Get photographer ID
        const image = await prisma.portfolioImage.findUnique({
            where: { image_id: imageId },
            include: { portfolio: { select: { user_id: true } } }
        });

        if (image) {
            await handlePhotoSave(imageId, userId, image.portfolio.user_id, false);
        }

        return res.json({
            success: true,
            message: 'Image unsaved',
            data: { isSaved: false }
        });
    } else {
        // Save
        await prisma.photoSave.create({
            data: {
                image_id: imageId,
                user_id: userId
            }
        });

        // Get photographer ID
        const image = await prisma.portfolioImage.findUnique({
            where: { image_id: imageId },
            include: { portfolio: { select: { user_id: true } } }
        });

        if (image) {
            await handlePhotoSave(imageId, userId, image.portfolio.user_id, true);

            // Notification for save
            const sender = await prisma.user.findUnique({ where: { user_id: userId }, select: { full_name: true } });
            await prisma.notification.create({
                data: {
                    user_id: image.portfolio.user_id,
                    title: 'Photo Saved',
                    type: 'LIKE', // Or 'SAVE' if you have it
                    message: `${sender?.full_name || 'Someone'} saved your photo!`,
                    is_read: false
                }
            });
        }

        return res.json({
            success: true,
            message: 'Image saved',
            data: { isSaved: true }
        });
    }
});

/**
 * GET /api/photographer/my-saves
 * Get all image IDs that the current user has saved.
 */
export const getUserSaves = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.user_id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const saves = await prisma.photoSave.findMany({
        where: { user_id: userId },
        include: {
            image: {
                include: {
                    portfolio: {
                        include: {
                            user: {
                                select: {
                                    user_id: true,
                                    full_name: true,
                                    profile_image: true
                                }
                            }
                        }
                    },
                    likes: true, // to check if liked by current user
                    comments: true
                }
            }
        }
    });

    const enrichImageWithUrl = (image: any) => ({
        ...image,
        image_url: `/api/photographer/portfolio/image/${image.image_id}`
    });

    const savedPosts = saves.map((s: any) => {
        const enrichedOuter = enrichImageWithUrl(s.image);
        return {
            ...enrichedOuter,
            photographer: s.image.portfolio.user,
            isLiked: s.image.likes.some((l: any) => l.user_id === userId),
            isSaved: true
        };
    });

    const savedImageIds = saves.map(s => s.image_id);

    return res.json({
        success: true,
        data: {
            savedPosts,
            savedImageIds
        }
    });
});
