-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "package_id" INTEGER;

-- CreateTable
CREATE TABLE "Package" (
    "package_id" SERIAL NOT NULL,
    "photographer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "features" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("package_id")
);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "Package"("package_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
