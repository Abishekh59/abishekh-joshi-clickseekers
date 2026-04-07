import prisma from '../model/index';

async function main() {
  try {
    const photographer = await prisma.user.findFirst({
      where: { role: 'PHOTOGRAPHER' },
      include: { packages: true }
    });

    if (!photographer) {
      console.log("No photographer found in DB");
      return;
    }

    console.log("Photographer ID:", photographer.user_id);
    if (photographer.packages && photographer.packages.length > 0) {
      console.log("Package ID:", photographer.packages[0].package_id);
    } else {
      console.log("No packages found for this photographer");
    }
  } catch (err) {
    console.error("Error connecting to DB:", err);
  } finally {
    // Prisma usually stays open if not explicitly closed
  }
}

main();
