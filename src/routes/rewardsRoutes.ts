import { Router } from 'express';
import { getLeaderboardData, getMyRewards } from '../controllers/rewardsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get current user's rewards
router.get('/me', authenticate, getMyRewards);

// Get leaderboard (public or authenticated)
router.get('/leaderboard', getLeaderboardData);

export default router;
