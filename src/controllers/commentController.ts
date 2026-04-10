import type { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';
import { getFullImageUrl } from '../utils/imageUtils';

/**
 * POST /api/photographer/portfolio/images/:imageId/comments
 * Add a comment (or reply) to a portfolio image
 */
export const addComment = catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const imageId = Number(req.params.imageId);
    if (!Number.isFinite(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    const { comment_text, parent_id } = req.body;
    if (!comment_text || typeof comment_text !== 'string' || !comment_text.trim()) {
        return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    // Verify image exists
    const image = await prisma.portfolioImage.findUnique({
        where: { image_id: imageId },
        include: {
            portfolio: {
                select: {
                    user_id: true
                }
            }
        }
    });

    if (!image) {
        return res.status(404).json({ success: false, message: 'Image not found' });
    }

    // If it's a reply, verify parent comment exists
    if (parent_id) {
        const parentComment = await prisma.comment.findUnique({
            where: { comment_id: Number(parent_id) }
        });
        if (!parentComment) {
            return res.status(404).json({ success: false, message: 'Parent comment not found' });
        }
    }

    // Create comment and increment count atomically
    const [comment] = await prisma.$transaction([
        prisma.comment.create({
            data: {
                image_id: imageId,
                user_id: authUser.user_id,
                comment_text: comment_text.trim(),
                parent_id: parent_id ? Number(parent_id) : null
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        full_name: true,
                        profile_image: true
                    }
                }
            }
        }),
        prisma.portfolioImage.update({
            where: { image_id: imageId },
            data: {
                comments_count: {
                    increment: 1
                }
            } as any
        })
    ]);

    // 4. Award points to photographer (only if commenter is NOT the photographer)
    if (image.portfolio.user_id !== authUser.user_id) {
        const { awardCommentPoints } = await import('../services/pointsService');
        await awardCommentPoints(image.portfolio.user_id, comment.comment_id);
    }

    // Create Notification and Emit Socket
    const io = (req as any).io;
    const author = await prisma.user.findUnique({ where: { user_id: authUser.user_id }, select: { full_name: true } });
    const authorName = author?.full_name || 'Someone';

    // 1. Notify image owner
    if (image.portfolio.user_id !== authUser.user_id) {
        const imageOwnerNotification = await prisma.notification.create({
            data: {
                user_id: image.portfolio.user_id,
                title: 'New Comment',
                type: 'COMMENT',
                message: `${authorName} commented on your photo: "${comment_text.substring(0, 50)}${comment_text.length > 50 ? '...' : ''}"`,
                is_read: false
            }
        });

        if (io) {
            const normalizedOwnerId = String(image.portfolio.user_id).toLowerCase();
            io.to(normalizedOwnerId).emit('new_notification', {
                ...imageOwnerNotification,
                userId: image.portfolio.user_id
            });
        }
    }

    // 2. If it's a reply, notify the parent comment owner
    if (parent_id) {
        const parentComment = await prisma.comment.findUnique({
            where: { comment_id: Number(parent_id) }
        });

        if (parentComment && parentComment.user_id !== authUser.user_id && parentComment.user_id !== image.portfolio.user_id) {
            const replyNotification = await prisma.notification.create({
                data: {
                    user_id: parentComment.user_id,
                    title: 'New Reply',
                    type: 'COMMENT',
                    message: `${authorName} replied to your comment: "${comment_text.substring(0, 50)}${comment_text.length > 50 ? '...' : ''}"`,
                    is_read: false
                }
            });

            if (io) {
                const normalizedParentId = String(parentComment.user_id).toLowerCase();
                io.to(normalizedParentId).emit('new_notification', {
                    ...replyNotification,
                    userId: parentComment.user_id
                });
            }
        }
    }

    if (io) {
        io.emit('photographer_updated', { imageId, type: 'comment' });
    }

    // Award points (5 points for receiving a comment)
    if (image.portfolio.user_id !== authUser.user_id) {
        const { awardCommentPoints } = await import('../services/pointsService');
        await awardCommentPoints(image.portfolio.user_id, comment.comment_id);
    }

    return res.status(201).json({
        success: true,
        message: parent_id ? 'Reply added successfully' : 'Comment added successfully',
        data: {
            ...comment,
            user: comment.user ? {
                ...comment.user,
                profile_image: getFullImageUrl(comment.user.profile_image)
            } : null
        }
    });
});

/**
 * GET /api/photographer/portfolio/images/:imageId/comments
 * Get all top-level comments and their replies for a portfolio image
 */
export const getComments = catchAsync(async (req: Request, res: Response) => {
    const imageId = Number(req.params.imageId);
    if (!Number.isFinite(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    const comments = await prisma.comment.findMany({
        where: {
            image_id: imageId,
            parent_id: null // Get top-level comments only
        },
        include: {
            user: {
                select: {
                    user_id: true,
                    full_name: true,
                    profile_image: true
                }
            },
            replies: {
                include: {
                    user: {
                        select: {
                            user_id: true,
                            full_name: true,
                            profile_image: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'asc'
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    const enrichedComments = comments.map((comment: any) => ({
        ...comment,
        user: comment.user ? {
            ...comment.user,
            profile_image: getFullImageUrl(comment.user.profile_image)
        } : null,
        replies: (comment.replies || []).map((reply: any) => ({
            ...reply,
            user: reply.user ? {
                ...reply.user,
                profile_image: getFullImageUrl(reply.user.profile_image)
            } : null
        }))
    }));

    return res.json({
        success: true,
        data: enrichedComments
    });
});

/**
 * PATCH /api/photographer/portfolio/images/:imageId/comments/:commentId
 * Update a comment text
 */
export const updateComment = catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const imageId = Number(req.params.imageId);
    const commentId = Number(req.params.commentId);
    const { comment_text } = req.body;

    if (!Number.isFinite(imageId) || !Number.isFinite(commentId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId or commentId' });
    }

    if (!comment_text || typeof comment_text !== 'string' || !comment_text.trim()) {
        return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const comment = await prisma.comment.findFirst({
        where: {
            comment_id: commentId,
            image_id: imageId
        }
    });

    if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user_id !== authUser.user_id) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }

    const updatedComment = await prisma.comment.update({
        where: { comment_id: commentId },
        data: { comment_text: comment_text.trim() },
        include: {
            user: {
                select: {
                    user_id: true,
                    full_name: true,
                    profile_image: true
                }
            }
        }
    });

    return res.json({
        success: true,
        message: 'Comment updated successfully',
        data: {
            ...updatedComment,
            user: updatedComment.user ? {
                ...updatedComment.user,
                profile_image: getFullImageUrl(updatedComment.user.profile_image)
            } : null
        }
    });
});

/**
 * DELETE /api/photographer/portfolio/images/:imageId/comments/:commentId
 * Delete a comment (only by comment owner or admin)
 */
export const deleteComment = catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const imageId = Number(req.params.imageId);
    const commentId = Number(req.params.commentId);

    if (!Number.isFinite(imageId) || !Number.isFinite(commentId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId or commentId' });
    }

    // Find comment and verify ownership
    const comment = await prisma.comment.findFirst({
        where: {
            comment_id: commentId,
            image_id: imageId
        }
    });

    if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only allow comment owner or admin to delete
    if (comment.user_id !== authUser.user_id && authUser.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Delete comment and decrement count atomically
    await prisma.$transaction([
        prisma.comment.delete({
            where: { comment_id: commentId }
        }),
        prisma.portfolioImage.update({
            where: { image_id: imageId },
            data: {
                comments_count: {
                    decrement: 1
                }
            } as any
        })
    ]);

    // Emit real-time update
    const io = (req as any).io;
    if (io) {
        io.emit('photographer_updated', { imageId, type: 'comment_deleted' });
    }

    // Deduct points (5 points for removing a comment)
    // We fetch the image owner from the comment relation if needed, but we already have imageId
    const imgId = imageId;
    const commentOwnerId = comment.user_id;

    // Find image owner
    const imageWithOwner = await prisma.portfolioImage.findUnique({
        where: { image_id: imgId },
        include: { portfolio: { select: { user_id: true } } }
    });

    if (imageWithOwner && imageWithOwner.portfolio.user_id !== commentOwnerId) {
        const { deductCommentPoints } = await import('../services/pointsService');
        await deductCommentPoints(imageWithOwner.portfolio.user_id, commentId);
    }

    return res.json({
        success: true,
        message: 'Comment deleted successfully'
    });
});
