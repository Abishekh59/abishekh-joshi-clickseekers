import { Request, Response } from 'express';
import { getLeaderboard, getUserReward } from '../services/pointsService';
import catchAsync from '../utils/catchAsync';

/**
 * GET /api/rewards/me
 * Get current user's reward status (points, badge, progress)
 */
export const getMyRewards = catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const rewardData = await getUserReward(authUser.user_id);

    res.json({
        success: true,
        data: rewardData
    });
});

/**
 * GET /api/rewards/leaderboard
 * Get leaderboard of top users by points
 */
export const getLeaderboardData = catchAsync(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const leaderboard = await getLeaderboard(limit);

    res.json({
        success: true,
        data: leaderboard
    });
});
