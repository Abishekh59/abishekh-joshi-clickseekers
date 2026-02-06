import type { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';

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
        where: { image_id: imageId }
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

    // Emit real-time update
    const io = (req as any).io;
    if (io) {
        io.emit('photographer_updated', { imageId, type: 'comment' });
    }

    return res.status(201).json({
        success: true,
        message: parent_id ? 'Reply added successfully' : 'Comment added successfully',
        data: comment
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

    return res.json({
        success: true,
        data: comments
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
        data: updatedComment
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

    return res.json({
        success: true,
        message: 'Comment deleted successfully'
    });
});
