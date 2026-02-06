
const { PrismaClient } = require('/Users/abishekjoshi/Desktop/Final-Year-project/Backend/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { email: 'abisekhjoshi123@gmail.com' },
        select: {
            user_id: true,
            full_name: true,
            email: true,
            role: true,
            bookings_as_client: {
                select: { booking_id: true }
            }
        }
    });

    console.log('User Details:', JSON.stringify(users, null, 2));

    if (users.length > 0) {
        const bookingCount = await prisma.booking.count({
            where: { client_id: users[0].user_id }
        });
        console.log('Real Booking Count:', bookingCount);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
