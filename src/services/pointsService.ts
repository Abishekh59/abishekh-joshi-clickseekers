import prisma from '../model/index';
import { getIo } from '../utils/socketInstance';

interface AwardPointsOptions {
    userId: string;
    points: number;
    reason: string;
}

/**
 * Award points to a user and update their badge tier
 */
export const awardPoints = async ({ userId, points, reason }: AwardPointsOptions): Promise<void> => {
    try {
        // Find user to check role
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { role: true }
        });

        if (!user || user.role !== 'PHOTOGRAPHER') {
            // Points are only awarded to photographers
            return;
        }

        // Find or create reward record for user
        let reward = await prisma.reward.findUnique({
            where: { user_id: userId },
            include: { badge: true }
        });

        if (!reward) {
            // Get the lowest badge (Rookie)
            const rookieBadge = await prisma.badge.findFirst({
                orderBy: { points_required: 'asc' }
            });

            if (!rookieBadge) {
                console.error('[PointsService] No badges found in database. Please seed badges.');
                return;
            }

            // Create new reward record
            reward = await prisma.reward.create({
                data: {
                    user_id: userId,
                    total_points: 0,
                    badge_id: rookieBadge.badge_id
                },
                include: { badge: true }
            });
        }

        // Update points
        const newTotalPoints = Math.max(0, reward.total_points + points); // Don't allow negative points

        // Get appropriate badge for new points total
        const newBadge = await getBadgeForPoints(newTotalPoints);

        if (!newBadge) {
            console.error('[PointsService] Could not determine badge for points:', newTotalPoints);
            return;
        }

        // Update reward and create history record in a transaction
        await prisma.$transaction([
            prisma.reward.update({
                where: { user_id: userId },
                data: {
                    total_points: newTotalPoints,
                    badge_id: newBadge.badge_id,
                    last_updated: new Date()
                }
            }),
            prisma.pointHistory.create({
                data: {
                    user_id: userId,
                    points: points,
                    reason: reason
                }
            })
        ]);
        
        // --- Added: Notifications for Point Awards ---
        try {
            const title = points >= 0 ? 'Points Awarded!' : 'Points Deducted!';
            const message = `You ${points >= 0 ? 'earned' : 'lost'} ${Math.abs(points)} points for: ${reason}`;
            
            // Create database notification
            const notification = await prisma.notification.create({
                data: {
                    user_id: userId,
                    title: title,
                    type: 'REWARD',
                    message: message,
                    is_read: false
                }
            });

            // Emit real-time notification via Socket.io
            const io = getIo();
            if (io) {
                const normalizedUserId = String(userId).toLowerCase();
                io.to(normalizedUserId).emit('new_notification', {
                    ...notification,
                    userId: userId // Ensure same structure as other notifications
                });
            }
        } catch (notifError) {
            console.error('[PointsService] Error sending reward notification:', notifError);
            // Don't fail the point award if notification fails
        }
        // ----------------------------------------------

        console.log(`[PointsService] Awarded ${points} points to user ${userId} for: ${reason}. New total: ${newTotalPoints}, Badge: ${newBadge.badge_name}`);
    } catch (error) {
        console.error('[PointsService] Error awarding points:', error);
    }
};

/**
 * Deduct points from a user
 */
export const deductPoints = async ({ userId, points, reason }: AwardPointsOptions): Promise<void> => {
    await awardPoints({ userId, points: -points, reason });
};

/**
 * Point values configuration as per ClickSeekers specification
 */
export const POINT_CONFIG = {
    // 1. Bookings
    BOOKING_ACCEPTED: 5,
    BOOKING_COMPLETED: 40,
    BOOKING_CANCELLED_BY_PHOTOGRAPHER: -20,
    BOOKING_CANCELLED_BY_CLIENT: 0,

    // 2. Reviews & Ratings
    REVIEW_5_STAR: 20,
    REVIEW_4_STAR: 10,
    REVIEW_3_STAR: 5,
    REVIEW_1_2_STAR: -10,

    // 3. Profile & Portfolio
    KYC_APPROVED: 30,
    PROFILE_100_COMPLETE: 0,
    PHOTO_UPLOAD: 0.5,
    PHOTO_UPLOAD_MAX_WEEKLY: 20,
    PHOTO_LIKE: 0.5,
    PHOTO_UNLIKE: -0.5,

    // 4. Engagement
    COMMENT_RECEIVED: 2,
    COMMENT_REMOVED: -2,
    SAVE_POST: 0,
    UNSAVE_POST: 0,
    SAVE_PROFILE_FIRST: 0,
    SAVE_PROFILE_REPEATED: 0,

    // 5. Consistency
    DAILY_LOGIN: 1,
    LOGIN_STREAK_7_DAY: 5,
    LOGIN_STREAK_30_DAY: 20,

    // 6. Leaderboard
    WEEKLY_RANK_1: 40,
    WEEKLY_RANK_2: 30,
    WEEKLY_RANK_3: 20,
    WEEKLY_RANK_4_10: 10,
    MONTHLY_WINNER: 50,
    QUARTERLY_TOP: 80,
};

/**
 * Award points for portfolio image upload with weekly limit
 */
export const awardPhotoUploadPoints = async (userId: string): Promise<boolean> => {
    try {
        const now = new Date();
        const weekStart = getWeekStart(now);

        let tracking = await prisma.weeklyUploadTracking.findUnique({
            where: {
                user_id_week_start: {
                    user_id: userId,
                    week_start: weekStart
                }
            }
        });

        if (!tracking) {
            tracking = await prisma.weeklyUploadTracking.create({
                data: {
                    user_id: userId,
                    week_start: weekStart,
                    upload_count: 0
                }
            });
        }

        if (tracking.upload_count >= POINT_CONFIG.PHOTO_UPLOAD_MAX_WEEKLY) {
            console.log(`[PointsService] Weekly upload limit reached for user ${userId}`);
            return false;
        }

        await prisma.weeklyUploadTracking.update({
            where: { tracking_id: tracking.tracking_id },
            data: { upload_count: tracking.upload_count + 1 }
        });

        await awardPoints({
            userId,
            points: POINT_CONFIG.PHOTO_UPLOAD,
            reason: `Photo uploaded (${tracking.upload_count + 1}/${POINT_CONFIG.PHOTO_UPLOAD_MAX_WEEKLY} this week)`
        });

        return true;
    } catch (error) {
        console.error('[PointsService] Error awarding photo upload points:', error);
        return false;
    }
};

/**
 * Handle photo like/unlike
 */
export const handlePhotoLike = async (imageId: number, userId: string, photographerId: string, isLike: boolean): Promise<void> => {
    try {
        if (photographerId === userId) return;

        if (isLike) {
            await awardPoints({
                userId: photographerId,
                points: POINT_CONFIG.PHOTO_LIKE,
                reason: `Photo liked (Image ID: ${imageId})`
            });
        } else {
            await awardPoints({
                userId: photographerId,
                points: POINT_CONFIG.PHOTO_UNLIKE,
                reason: `Photo unliked (Image ID: ${imageId})`
            });
        }
    } catch (error) {
        console.error('[PointsService] Error handling photo like:', error);
    }
};

/**
 * Handle photo save/unsave
 */
export const handlePhotoSave = async (imageId: number, userId: string, photographerId: string, isSave: boolean): Promise<void> => {
    try {
        if (photographerId === userId) return;

        if (isSave) {
            await awardPoints({
                userId: photographerId,
                points: POINT_CONFIG.SAVE_POST,
                reason: `Photo saved (Image ID: ${imageId})`
            });
        } else {
            await awardPoints({
                userId: photographerId,
                points: POINT_CONFIG.UNSAVE_POST,
                reason: `Photo unsaved (Image ID: ${imageId})`
            });
        }
    } catch (error) {
        console.error('[PointsService] Error handling photo save:', error);
    }
};

/**
 * Award points for verified comment from client
 */
export const awardCommentPoints = async (photographerId: string, commentId: number): Promise<void> => {
    await awardPoints({
        userId: photographerId,
        points: POINT_CONFIG.COMMENT_RECEIVED,
        reason: `Comment received (Comment ID: ${commentId})`
    });
};

/**
 * Deduct points when comment is removed
 */
export const deductCommentPoints = async (photographerId: string, commentId: number): Promise<void> => {
    await awardPoints({
        userId: photographerId,
        points: POINT_CONFIG.COMMENT_REMOVED,
        reason: `Comment removed (Comment ID: ${commentId})`
    });
};

/**
 * Award points for completed booking
 */
export const awardBookingPoints = async (photographerId: string, bookingId: number): Promise<void> => {
    await awardPoints({
        userId: photographerId,
        points: POINT_CONFIG.BOOKING_COMPLETED,
        reason: `Booking completed (Booking ID: ${bookingId})`
    });
};

/**
 * Handle photographer save/unsave by client
 */
export const handlePhotographerSave = async (photographerId: string, clientId: string, isSave: boolean): Promise<void> => {
    try {
        if (isSave) {
            const existing = await prisma.photographerSave.findUnique({
                where: {
                    photographer_id_client_id: {
                        photographer_id: photographerId,
                        client_id: clientId
                    }
                }
            });

            if (!existing) {
                await prisma.photographerSave.create({
                    data: {
                        photographer_id: photographerId,
                        client_id: clientId
                    }
                });

                await awardPoints({
                    userId: photographerId,
                    points: POINT_CONFIG.SAVE_PROFILE_FIRST,
                    reason: `Profile saved by client`
                });
            } else {
                // Repeated save
                await awardPoints({
                    userId: photographerId,
                    points: POINT_CONFIG.SAVE_PROFILE_REPEATED,
                    reason: `Profile re-saved by client`
                });
            }
        }
    } catch (error) {
        console.error('[PointsService] Error handling photographer save:', error);
    }
};

/**
 * Award points for KYC approval
 */
export const awardKycApprovalPoints = async (userId: string): Promise<void> => {
    await awardPoints({
        userId,
        points: POINT_CONFIG.KYC_APPROVED,
        reason: 'KYC & Profile completion approved'
    });
};

/**
 * Track daily login and award points/bonuses
 */
export const trackLogin = async (userId: string): Promise<void> => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { role: true }
        });

        if (!user || user.role !== 'PHOTOGRAPHER') {
            // Only photographers track logins for points and streaks
            return;
        }

        let tracking = await prisma.loginTracking.findUnique({
            where: { user_id: userId }
        });

        if (!tracking) {
            tracking = await prisma.loginTracking.create({
                data: {
                    user_id: userId,
                    last_login: now,
                    current_streak_days: 1,
                    longest_streak_days: 1,
                    total_logins: 1
                }
            });

            await awardPoints({
                userId,
                points: POINT_CONFIG.DAILY_LOGIN,
                reason: 'Daily login'
            });
            return;
        }

        const lastLoginDate = new Date(tracking.last_login.getFullYear(), tracking.last_login.getMonth(), tracking.last_login.getDate());
        const daysDiff = Math.floor((today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            return;
        }

        let newStreakDays = tracking.current_streak_days;

        if (daysDiff === 1) {
            newStreakDays += 1;
        } else {
            newStreakDays = 1;
        }

        const longestStreak = Math.max(tracking.longest_streak_days, newStreakDays);

        await prisma.loginTracking.update({
            where: { user_id: userId },
            data: {
                last_login: now,
                current_streak_days: newStreakDays,
                longest_streak_days: longestStreak,
                total_logins: tracking.total_logins + 1
            }
        });

        await awardPoints({
            userId,
            points: POINT_CONFIG.DAILY_LOGIN,
            reason: 'Daily login'
        });

        if (newStreakDays === 7) {
            await awardPoints({
                userId,
                points: POINT_CONFIG.LOGIN_STREAK_7_DAY,
                reason: '7-day login streak bonus'
            });
        }

        if (newStreakDays === 30) {
            await awardPoints({
                userId,
                points: POINT_CONFIG.LOGIN_STREAK_30_DAY,
                reason: '30-day active month bonus'
            });
        }
    } catch (error) {
        console.error('[PointsService] Error tracking login:', error);
    }
};

/**
 * Get the appropriate badge for a given points total
 * Returns the highest badge the user qualifies for
 */
export const getBadgeForPoints = async (totalPoints: number) => {
    const badges = await prisma.badge.findMany({
        where: {
            points_required: { lte: totalPoints }
        },
        orderBy: { points_required: 'desc' }
    });

    // Return highest badge they qualify for, or the lowest badge if they don't qualify for any
    if (badges.length > 0) {
        return badges[0];
    }

    // Return lowest badge as fallback
    return await prisma.badge.findFirst({
        orderBy: { points_required: 'asc' }
    });
};

/**
 * Get leaderboard of top users by points
 * Supports periods: 'weekly', 'monthly', 'all-time'
 */
export const getLeaderboard = async (limit: number = 50, period: string = 'all-time', role?: string) => {
    try {
        if (period === 'all-time') {
            const topUsers = await prisma.reward.findMany({
                where: {
                    user: {
                        ...(role ? { role: role as any } : {}),
                        status: 'ACTIVE'
                    }
                },
                take: limit,
                orderBy: { total_points: 'desc' },
                include: {
                    user: {
                        select: {
                            user_id: true,
                            full_name: true,
                            profile_image: true,
                            role: true
                        }
                    },
                    badge: true
                }
            });

            return topUsers.map((reward, index) => ({
                rank: index + 1,
                userId: reward.user.user_id,
                fullName: reward.user.full_name,
                profileImage: reward.user.profile_image,
                totalPoints: reward.total_points,
                badgeName: reward.badge.badge_name,
                badgeId: reward.badge.badge_id
            }));
        }

        // For weekly/monthly, we sum points from PointHistory
        const now = new Date();
        let startDate = new Date();

        if (period === 'weekly') {
            startDate = getWeekStart(now);
        } else if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startDate = new Date(0); // Fallback to all time
        }

        // Aggregate points by user for the period
        const historyAgg = await prisma.pointHistory.groupBy({
            by: ['user_id'],
            _sum: {
                points: true
            },
            where: {
                created_at: {
                    gte: startDate
                },
                user: {
                    ...(role ? { role: role as any } : {}),
                    status: 'ACTIVE'
                }
            },
            orderBy: {
                _sum: {
                    points: 'desc'
                }
            },
            take: limit
        });

        // Enrich with user and badge info
        return await Promise.all(historyAgg.map(async (item: any, index: number) => {
            const reward = await prisma.reward.findUnique({
                where: { user_id: item.user_id },
                include: {
                    user: {
                        select: {
                            full_name: true,
                            profile_image: true
                        }
                    },
                    badge: true
                }
            });

            return {
                rank: index + 1,
                userId: item.user_id,
                fullName: reward?.user.full_name || 'Unknown',
                profileImage: reward?.user.profile_image,
                totalPoints: item._sum.points || 0,
                badgeName: reward?.badge.badge_name || 'Novice',
                badgeId: reward?.badge_id
            };
        }));
    } catch (error) {
        console.error('[PointsService] Error fetching leaderboard:', error);
        return [];
    }
};

/**
 * Get user's current reward status
 */
export const getUserReward = async (userId: string) => {
    // Check user role first
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { role: true }
    });

    if (!user || user.role !== 'PHOTOGRAPHER') {
        return {
            totalPoints: 0,
            badge: null,
            nextBadge: null
        };
    }

    const reward = await prisma.reward.findUnique({
        where: { user_id: userId },
        include: { badge: true }
    });

    if (!reward) {
        // User has no reward record yet, return default Rookie badge
        const rookieBadge = await prisma.badge.findFirst({
            orderBy: { points_required: 'asc' }
        });

        return {
            totalPoints: 0,
            badge: rookieBadge,
            nextBadge: await getNextBadge(0)
        };
    }

    return {
        totalPoints: reward.total_points,
        badge: reward.badge,
        nextBadge: await getNextBadge(reward.total_points)
    };
};

/**
 * Get the next badge tier above current points
 */
export const getNextBadge = async (currentPoints: number) => {
    const nextBadge = await prisma.badge.findFirst({
        where: {
            points_required: { gt: currentPoints }
        },
        orderBy: { points_required: 'asc' }
    });

    return nextBadge;
};

/**
 * Get the appropriate badge name for a given points total (synchronous helper)
 */
export const getBadgeTier = (points: number): string => {
    if (points >= 6000) return 'Golden Lens';
    if (points >= 3000) return 'Elite Lens';
    if (points >= 1500) return 'Pro Shooter';
    if (points >= 800) return 'Rising Star';
    if (points >= 300) return 'Rookie';
    return 'Beginner';
};

/**
 * Helper: Get the start of the current week (Sunday)
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}
