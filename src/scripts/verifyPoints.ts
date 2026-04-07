import "dotenv/config";
import prisma from '../model/index';
import { getUserReward, handlePhotoLike, handlePhotoSave } from '../services/pointsService';

async function testPoints() {
    console.log('--- Starting Points System Verification ---');

    try {
        // 1. Find a photographer and a client for testing
        const photographer = await prisma.user.findFirst({
            where: { role: 'PHOTOGRAPHER' },
            include: { rewards: true }
        });

        const client = await prisma.user.findFirst({
            where: { role: 'CLIENT' }
        });

        if (!photographer || !client) {
            console.error('Test aborted: Need at least one photographer and one client in DB.');
            return;
        }

        const image = await prisma.portfolioImage.findFirst({
            where: { portfolio: { user_id: photographer.user_id } }
        });

        if (!image) {
            console.error('Test aborted: Need at least one portfolio image for the photographer.');
            return;
        }

        console.log(`Testing with Photographer: ${photographer.full_name} (${photographer.user_id})`);
        console.log(`Testing with Client: ${client.full_name} (${client.user_id})`);
        console.log(`Initial Points: ${photographer.rewards?.total_points || 0}`);

        // 2. Simulate Like
        console.log('\nStep 1: Simulating Like Action...');
        // In actual controller, the record is created first. We'll skip making the record here
        // as our refactored handlePhotoLike doesn't depend on it anymore for point awarding.
        await handlePhotoLike(image.image_id, client.user_id, photographer.user_id, true);

        const rewardsAfterLike = await getUserReward(photographer.user_id);
        console.log(`Points After Like: ${rewardsAfterLike.totalPoints} (Expected +0.5 increment)`);

        // 3. Simulate Save
        console.log('\nStep 2: Simulating Save Action...');
        await handlePhotoSave(image.image_id, client.user_id, photographer.user_id, true);

        const rewardsAfterSave = await getUserReward(photographer.user_id);
        console.log(`Points After Save: ${rewardsAfterSave.totalPoints} (Expected +2.0 increment)`);

        // 4. Simulate Unlike
        console.log('\nStep 3: Simulating Unlike Action...');
        await handlePhotoLike(image.image_id, client.user_id, photographer.user_id, false);

        const rewardsAfterUnlike = await getUserReward(photographer.user_id);
        console.log(`Points After Unlike: ${rewardsAfterUnlike.totalPoints} (Expected -0.5 decrement)`);

        console.log('\n--- Verification Complete ---');
    } catch (error) {
        console.error('Test failed with error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testPoints();
