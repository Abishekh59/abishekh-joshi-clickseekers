import "dotenv/config";
import prisma from '../model/index';

const deleteAllUsersExceptAdmin = async () => {
  try {
    // Get all non-admin users
    const nonAdminUsers = await prisma.user.findMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });

    console.log(`Found ${nonAdminUsers.length} non-admin users to delete`);

    for (const user of nonAdminUsers) {
      // Delete related KYC verifications (where this user is the verified_by)
      await prisma.kycVerification.deleteMany({
        where: {
          verified_by: user.user_id
        }
      });

      // Delete related KYC verifications (where this user is the owner)
      await prisma.kycVerification.deleteMany({
        where: {
          user_id: user.user_id
        }
      });

      // Delete related reports (made by user)
      await prisma.report.deleteMany({
        where: {
          reported_by: user.user_id
        }
      });

      // Delete related reports (received by user)
      await prisma.report.deleteMany({
        where: {
          target_user: user.user_id
        }
      });

      // Delete related reviews
      await prisma.review.deleteMany({
        where: {
          reviewer_id: user.user_id
        }
      });

      // Delete related chats (sent messages)
      await prisma.chat.deleteMany({
        where: {
          sender_id: user.user_id
        }
      });

      // Delete related chats (received messages)
      await prisma.chat.deleteMany({
        where: {
          receiver_id: user.user_id
        }
      });

      // Delete related payments
      await prisma.payment.deleteMany({
        where: {
          booking: {
            OR: [
              { client_id: user.user_id },
              { photographer_id: user.user_id }
            ]
          }
        }
      });

      // Delete related bookings
      await prisma.booking.deleteMany({
        where: {
          OR: [
            { client_id: user.user_id },
            { photographer_id: user.user_id }
          ]
        }
      });

      // Delete related portfolio images
      await prisma.portfolioImage.deleteMany({
        where: {
          portfolio: {
            user_id: user.user_id
          }
        }
      });

      // Delete related portfolios
      await prisma.portfolio.deleteMany({
        where: {
          user_id: user.user_id
        }
      });

      // Delete related rewards
      await prisma.reward.deleteMany({
        where: {
          user_id: user.user_id
        }
      });

      // Delete the user
      await prisma.user.delete({
        where: {
          user_id: user.user_id
        }
      });

      console.log(`Deleted user: ${user.email}`);
    }

    console.log(`\nSuccessfully deleted ${nonAdminUsers.length} users (all except admin)`);
  } catch (error) {
    console.error('Error deleting users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

deleteAllUsersExceptAdmin();
