
import bcrypt from 'bcrypt';
import 'dotenv/config';
import prisma from '../src/model/index';

async function seedAll() {
    console.log('Seeding database...');

    // 0. Default Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'clickseekersofficial@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '123456';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminPassword, saltRounds);

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            password_hash,
            role: 'ADMIN',
            email_verified: true,
            kyc_verified: true,
        },
        create: {
            full_name: adminName,
            email: adminEmail,
            password_hash,
            role: 'ADMIN',
            email_verified: true,
            kyc_verified: true,
        },
    });
    console.log(`Admin user ${adminEmail} seeded`);

    // 1. Booking Statuses
    const bookingStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
    for (const status of bookingStatuses) {
        await prisma.bookingStatus.upsert({
            where: { status_name: status },
            update: {},
            create: { status_name: status },
        });
    }
    console.log('BookingStatus seeded');

    // 2. Payment Statuses
    const paymentStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
    for (const status of paymentStatuses) {
        await prisma.paymentStatus.upsert({
            where: { status_name: status },
            update: {},
            create: { status_name: status },
        });
    }
    console.log('PaymentStatus seeded');

    // 3. Report Statuses
    const reportStatuses = ['PENDING', 'RESOLVED', 'DISMISSED'];
    for (const status of reportStatuses) {
        await prisma.reportStatus.upsert({
            where: { status_name: status },
            update: {},
            create: { status_name: status },
        });
    }
    console.log('ReportStatus seeded');

    // 4. Payment Methods
    const paymentMethods = ['ESEWA', 'KHALTI', 'CASH'];
    for (const method of paymentMethods) {
        await prisma.paymentMethod.upsert({
            where: { method_name: method },
            update: {},
            create: { method_name: method },
        });
    }
    console.log('PaymentMethod seeded');

    // 5. Badges
    const badges = [
        { badge_name: 'Beginner', points_required: 0, commission_percentage: 10 },
        { badge_name: 'Rookie', points_required: 300, commission_percentage: 10 },
        { badge_name: 'Rising Star', points_required: 800, commission_percentage: 9 },
        { badge_name: 'Pro Shooter', points_required: 1500, commission_percentage: 8 },
        { badge_name: 'Elite Lens', points_required: 3000, commission_percentage: 6 },
        { badge_name: 'Golden Lens', points_required: 6000, commission_percentage: 5 },
    ];
    for (const badge of badges) {
        await prisma.badge.upsert({
            where: { badge_name: badge.badge_name },
            update: {
                points_required: badge.points_required,
                commission_percentage: badge.commission_percentage
            },
            create: badge,
        });
    }
    console.log('Badge seeded');

    console.log('Seeding completed successfully.');
}

seedAll()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
