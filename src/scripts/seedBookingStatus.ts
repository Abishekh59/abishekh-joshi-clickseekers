
import 'dotenv/config';
import prisma from '../model/index';

async function seedBookingStatus() {
  await prisma.bookingStatus.createMany({
    data: [
      { status_name: 'PENDING' },
      { status_name: 'ACCEPTED' },
      { status_name: 'REJECTED' },
      { status_name: 'COMPLETED' },
      { status_name: 'CANCELLED' }
    ],
    skipDuplicates: true
  });
  console.log('BookingStatus table seeded!');
}

seedBookingStatus().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
