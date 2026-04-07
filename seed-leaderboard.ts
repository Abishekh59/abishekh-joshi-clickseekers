import dotenv from 'dotenv';
import prisma from './src/model/index';
dotenv.config();

// Leaderboard data to seed (matching the mockup)
const leaderboardData = [
    { name: 'Abishekh Joshi', email: 'abishekh@clickseekers.com', points: 43 },
    { name: 'Rhythm Rai', email: 'rhythm@clickseekers.com', points: 40 },
    { name: 'Nikhil Udas', email: 'nikhil@clickseekers.com', points: 38 },
    { name: 'Pradip Khadka', email: 'pradip@clickseekers.com', points: 36 },
    { name: 'Avishek Giri', email: 'avishek@clickseekers.com', points: 35 },
    { name: 'Abiskar Joshi', email: 'abiskar@clickseekers.com', points: 34 },
    { name: 'Sandhya Shrestha', email: 'sandhya@clickseekers.com', points: 33 },
    { name: 'Sabdika Basnet', email: 'sabdika@clickseekers.com', points: 32 },
    { name: 'Shova Shrestha', email: 'shova@clickseekers.com', points: 31 },
    { name: 'Sishan Binaya', email: 'sishan@clickseekers.com', points: 30 },
];

async function main() {
    try {
        console.log('--- Seeding Leaderboard Data ---');

        // Ensure the rookie badge exists
        const rookieBadge = await prisma.badge.upsert({
            where: { badge_name: 'Rookie' },
            update: {},
            create: { badge_name: 'Rookie', points_required: 300 }
        });
        console.log('Rookie badge ID:', rookieBadge.badge_id);

        for (const entry of leaderboardData) {
            // Find or create the user
            let user = await prisma.user.findFirst({
                where: { full_name: entry.name, role: 'PHOTOGRAPHER' as any }
            });

            if (!user) {
                // Create a new photographer user
                user = await prisma.user.create({
                    data: {
                        full_name: entry.name,
                        email: entry.email,
                        password_hash: '$2b$10$placeholder_hash_for_seed_data',
                        role: 'PHOTOGRAPHER' as any,
                    }
                });
                console.log(`Created user: ${user.full_name}`);
            } else {
                console.log(`Found existing user: ${user.full_name}`);
            }

            // Upsert the reward record
            await prisma.reward.upsert({
                where: { user_id: user.user_id },
                update: { total_points: entry.points },
                create: {
                    user_id: user.user_id,
                    total_points: entry.points,
                    badge_id: rookieBadge.badge_id
                }
            });
            console.log(`  Set ${user.full_name} to ${entry.points} pts`);
        }

        // Print final leaderboard
        const leaderboard = await prisma.reward.findMany({
            orderBy: { total_points: 'desc' },
            include: { user: { select: { full_name: true } } }
        });

        console.log('\n--- Final Leaderboard ---');
        leaderboard.forEach((r, i) => {
            console.log(`${i + 1}. ${r.user.full_name}: ${r.total_points} pts`);
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
