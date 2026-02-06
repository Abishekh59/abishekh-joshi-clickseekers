/*
  Warnings:

  - Made the column `package_id` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_package_id_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "package_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "Package"("package_id") ON DELETE RESTRICT ON UPDATE CASCADE;
