
import 'dotenv/config';
import prisma from '../model/index';

async function seedAll() {
    console.log('Seeding database...');

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

    console.log('Seeding completed successfully.');
}

seedAll()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
