import { awardPoints } from '../services/pointsService';
import prisma from '../model/index';
import 'dotenv/config';

async function testNotification() {
    console.log('--- Testing Points Notification ---');
    
    // 1. Find a test photographer
    const photographer = await prisma.user.findFirst({
        where: { role: 'PHOTOGRAPHER' }
    });

    if (!photographer) {
        console.error('No photographer found in database to test with.');
        process.exit(1);
    }

    console.log(`Testing with photographer: ${photographer.full_name} (${photographer.user_id})`);

    // 2. Clear previous notifications for this user (optional)
    await prisma.notification.deleteMany({
        where: { user_id: photographer.user_id, type: 'REWARD' }
    });

    // 3. Award points
    const testPoints = 15;
    const testReason = 'Testing system notification';
    
    console.log(`Awarding ${testPoints} points...`);
    await awardPoints({
        userId: photographer.user_id,
        points: testPoints,
        reason: testReason
    });

    // 4. Verify notification in database
    const notification = await prisma.notification.findFirst({
        where: { 
            user_id: photographer.user_id,
            type: 'REWARD'
        },
        orderBy: { created_at: 'desc' }
    });

    if (notification) {
        console.log('SUCCESS: Notification created in database!');
        console.log('Title:', notification.title);
        console.log('Message:', notification.message);
        
        if (notification.message.includes(String(testPoints)) && notification.message.includes(testReason)) {
            console.log('SUCCESS: Notification content is correct.');
        } else {
            console.error('FAILURE: Notification content mismatch.');
        }
    } else {
        console.error('FAILURE: No notification found in database.');
    }

    await prisma.$disconnect();
}

testNotification().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
