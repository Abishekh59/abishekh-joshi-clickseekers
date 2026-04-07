import dotenv from 'dotenv';
import prisma from './src/model/index';
dotenv.config();

async function main() {
    try {
        console.log('--- Checking Rewards and Points ---');

        const photographerCount = await prisma.user.count({
            where: { role: 'PHOTOGRAPHER' as any }
        });
        console.log('Photographer count:', photographerCount);

        const rewardCount = await prisma.reward.count();
        console.log('Reward records count:', rewardCount);

        const leaderboard = await prisma.reward.findMany({
            orderBy: { total_points: 'desc' },
            include: { user: { select: { full_name: true } } }
        });

        console.log('--- Current Leaderboard ---');
        leaderboard.forEach((r: any, i: number) => {
            console.log(`${i + 1}. ${r.user.full_name}: ${r.total_points} pts`);
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
