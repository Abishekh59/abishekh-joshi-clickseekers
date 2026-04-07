import dotenv from 'dotenv';
import prisma from './src/model/index';
dotenv.config();

async function main() {
    try {
        console.log('--- Restoring real photographer points from PointHistory ---');

        // Get all photographers
        const photographers = await (prisma.user as any).findMany({
            where: { role: 'PHOTOGRAPHER' }
        });

        console.log(`Found ${photographers.length} photographers`);

        // Get rookie badge
        const rookieBadge = await prisma.badge.findFirst({
            where: { badge_name: 'Rookie' }
        });
        if (!rookieBadge) throw new Error('Rookie badge not found');

        for (const photographer of photographers) {
            // Sum actual points from PointHistory
            const result = await prisma.pointHistory.aggregate({
                where: { user_id: photographer.user_id },
                _sum: { points: true }
            });

            const realPoints = result._sum.points ?? 0;
            console.log(`${photographer.full_name}: real points from history = ${realPoints}`);

            // Update reward record to match actual points
            await prisma.reward.upsert({
                where: { user_id: photographer.user_id },
                update: { total_points: realPoints },
                create: {
                    user_id: photographer.user_id,
                    total_points: realPoints,
                    badge_id: rookieBadge.badge_id
                }
            });
        }

        // Print final leaderboard
        const leaderboard = await prisma.reward.findMany({
            orderBy: { total_points: 'desc' },
            include: { user: { select: { full_name: true } } }
        });

        console.log('\n--- Final Leaderboard (actual points from DB) ---');
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
