
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentPayments() {
    try {
        console.log("Checking recent payments...");
        const payments = await prisma.payment.findMany({
            include: {
                status: true,
                booking: {
                    include: {
                        status: true,
                        client: { select: { full_name: true } },
                        photographer: { select: { full_name: true } }
                    }
                }
            },
            orderBy: { payment_id: 'desc' },
            take: 10
        });

        if (payments.length === 0) {
            console.log("No payments found in the database.");
        } else {
            payments.forEach(p => {
                console.log(`Payment ID: ${p.payment_id}, Booking ID: ${p.booking_id}, Amount: ${p.amount}, Status: ${p.status?.status_name}, Booking Status: ${p.booking?.status?.status_name}, Client: ${p.booking?.client?.full_name}`);
            });
        }

        console.log("\nChecking all bookings with ACCEPTED status but no payment record...");
        const unpaidAccepted = await prisma.booking.findMany({
            where: {
                status: { status_name: 'ACCEPTED' },
                payment: null
            },
            include: {
                client: { select: { full_name: true } }
            }
        });

        unpaidAccepted.forEach(b => {
            console.log(`Booking ID: ${b.booking_id}, Amount: ${b.amount}, Client: ${b.client.full_name}, Date: ${b.event_date}`);
        });

    } catch (e) {
        console.error("Error in diagnostic script:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkRecentPayments();
