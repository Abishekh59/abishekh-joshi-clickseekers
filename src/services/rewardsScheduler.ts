import cron from 'node-cron';
import prisma from '../model/index';
import { awardPoints, POINT_CONFIG } from './pointsService';

/**
 * Weekly Leaderboard Rewards (Every Sunday at Midnight)
 */
const awardWeeklyRewards = async () => {
    console.log('[RewardsScheduler] Starting weekly leaderboard rewards check...');
    try {
        const { getLeaderboard } = await import('./pointsService');
        const leaderboard = await getLeaderboard(10, 'weekly', 'PHOTOGRAPHER');

        if (leaderboard.length === 0) return;

        for (const player of leaderboard) {
            let pointsToAward = 0;
            let reason = `Weekly Leaderboard Rank #${player.rank}`;

            if (player.rank === 1) pointsToAward = POINT_CONFIG.WEEKLY_RANK_1;
            else if (player.rank === 2) pointsToAward = POINT_CONFIG.WEEKLY_RANK_2;
            else if (player.rank === 3) pointsToAward = POINT_CONFIG.WEEKLY_RANK_3;
            else if (player.rank >= 4 && player.rank <= 10) pointsToAward = POINT_CONFIG.WEEKLY_RANK_4_10;

            if (pointsToAward > 0) {
                await awardPoints({
                    userId: player.userId,
                    points: pointsToAward,
                    reason: reason
                });
            }
        }
        console.log(`[RewardsScheduler] Awarded weekly points to ${leaderboard.length} photographers.`);
    } catch (error) {
        console.error('[RewardsScheduler] Error in weekly rewards:', error);
    }
};

/**
 * Monthly Leaderboard Rewards (1st of every month at Midnight)
 */
const awardMonthlyRewards = async () => {
    console.log('[RewardsScheduler] Starting monthly leaderboard rewards check...');
    try {
        const { getLeaderboard } = await import('./pointsService');
        const leaderboard = await getLeaderboard(1, 'monthly', 'PHOTOGRAPHER');

        if (leaderboard.length > 0) {
            const winner = leaderboard[0];
            await awardPoints({
                userId: winner.userId,
                points: POINT_CONFIG.MONTHLY_WINNER,
                reason: 'Monthly Leaderboard Winner'
            });
            console.log(`[RewardsScheduler] Awarded monthly points to ${winner.fullName}.`);
        }
    } catch (error) {
        console.error('[RewardsScheduler] Error in monthly rewards:', error);
    }
};

/**
 * Finalized approach: Quartz-equivalent for Node using cron patterns
 */
export const initRewardsScheduler = () => {
    // Weekly: Sunday midnight
    cron.schedule('0 0 * * 0', awardWeeklyRewards);

    // Monthly: 1st of month midnight
    cron.schedule('0 0 1 * *', awardMonthlyRewards);

    // Quarterly: 1st of Jan, Apr, Jul, Oct
    cron.schedule('0 0 1 1,4,7,10 *', async () => {
        console.log('[RewardsScheduler] Starting quarterly rewards check...');
        try {
            // Logic for top performer of the quarter
            // For simplicity, we can use all-time top performer in that quarter if we had quarter filters
            // But spec says All-Time Top Performer (Quarterly) -> likely just the top of that period
            const { getLeaderboard } = await import('./pointsService');
            const leaderboard = await getLeaderboard(1, 'all-time', 'PHOTOGRAPHER');
            if (leaderboard.length > 0) {
                const top = leaderboard[0];
                await awardPoints({
                    userId: top.userId,
                    points: POINT_CONFIG.QUARTERLY_TOP,
                    reason: 'Quarterly Top Performer Reward'
                });
            }
        } catch (error) {
            console.error('[RewardsScheduler] Error in quarterly rewards:', error);
        }
    });

    console.log('[RewardsScheduler] Rewards jobs scheduled.');
};
