
import * as bookingController from './controllers/bookingController';
import prisma from './model/index';

async function test() {
    console.log('Testing prisma client...');
    try {
        const userCount = await prisma.user.count();
        console.log('Successfully connected to DB. User count:', userCount);
        console.log('Checking controllers...');
        console.log('Booking controller exported keys:', Object.keys(bookingController));
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
        process.exit(1);
    }
}

test();
