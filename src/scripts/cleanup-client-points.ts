import "dotenv/config";
import prisma from '../model/index';

const cleanupClientPoints = async () => {
    try {
        console.log('--- Starting Cleanup of Client Points and Rewards ---');

        // 1. Find all users who are NOT photographers
        const nonPhotographers = await prisma.user.findMany({
            where: {
                role: {
                    not: 'PHOTOGRAPHER'
                }
            },
            select: {
                user_id: true,
                email: true,
                role: true
            }
        });

        const nonPhotographerIds = nonPhotographers.map(u => u.user_id);
        console.log(`Found ${nonPhotographers.length} users with non-photographer roles (CLIENT or ADMIN).`);

        if (nonPhotographerIds.length === 0) {
            console.log('No non-photographer users found. Cleanup complete.');
            return;
        }

        // 2. Count records before deletion
        const [rewardCount, historyCount, loginTrackingCount, weeklyUploadCount] = await Promise.all([
            prisma.reward.count({ where: { user_id: { in: nonPhotographerIds } } }),
            prisma.pointHistory.count({ where: { user_id: { in: nonPhotographerIds } } }),
            prisma.loginTracking.count({ where: { user_id: { in: nonPhotographerIds } } }),
            prisma.weeklyUploadTracking.count({ where: { user_id: { in: nonPhotographerIds } } })
        ]);

        console.log(`To be deleted:`);
        console.log(`- Reward records: ${rewardCount}`);
        console.log(`- PointHistory records: ${historyCount}`);
        console.log(`- LoginTracking records: ${loginTrackingCount}`);
        console.log(`- WeeklyUploadTracking records: ${weeklyUploadCount}`);

        // 3. Perform deletions in a transaction
        await prisma.$transaction([
            prisma.pointHistory.deleteMany({ where: { user_id: { in: nonPhotographerIds } } }),
            prisma.reward.deleteMany({ where: { user_id: { in: nonPhotographerIds } } }),
            prisma.loginTracking.deleteMany({ where: { user_id: { in: nonPhotographerIds } } }),
            prisma.weeklyUploadTracking.deleteMany({ where: { user_id: { in: nonPhotographerIds } } })
        ]);

        console.log('--- Successfully deleted all points and rewards data for non-photographer users. ---');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
};

cleanupClientPoints();
