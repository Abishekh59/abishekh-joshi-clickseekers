
import cron from 'node-cron';
import prisma from '../model/index';

/**
 * Initializes the automated booking completion job.
 * Runs every day at midnight (00:00).
 */
export const initBookingScheduler = () => {
    // Schedule task to run every day at 00:00:00
    cron.schedule('0 0 * * *', async () => {
        console.log(`[Scheduler] Starting automated booking completion check at ${new Date().toISOString()}`);

        try {
            // Get today's date at start of day (00:00:00)
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // 1. Get status IDs
            const acceptedStatus = await prisma.bookingStatus.findUnique({
                where: { status_name: 'ACCEPTED' }
            });

            const completedStatus = await prisma.bookingStatus.findUnique({
                where: { status_name: 'COMPLETED' }
            });

            if (!acceptedStatus || !completedStatus) {
                console.error('[Scheduler] Could not find required booking statuses (ACCEPTED/COMPLETED). Aborting.');
                return;
            }

            // 2. Find bookings that are ACCEPTED and event_date is strictly before today
            const bookingsToComplete = await prisma.booking.findMany({
                where: {
                    status_id: acceptedStatus.status_id,
                    event_date: {
                        lt: now
                    }
                }
            });

            if (bookingsToComplete.length > 0) {
                const { awardBookingPoints } = await import('./pointsService');

                for (const booking of bookingsToComplete) {
                    await prisma.booking.update({
                        where: { booking_id: booking.booking_id },
                        data: { status_id: completedStatus.status_id }
                    });

                    await awardBookingPoints(booking.photographer_id, booking.booking_id);
                }
            }

            console.log(`[Scheduler] Completed ${bookingsToComplete.length} past bookings.`);

        } catch (error) {
            console.error('[Scheduler] Error running automated booking completion job:', error);
        }
    });

    console.log('[Scheduler] Booking completion job scheduled (00:00 daily).');
};
