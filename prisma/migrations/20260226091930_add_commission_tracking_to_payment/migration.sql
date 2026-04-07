-- DropForeignKey
ALTER TABLE "PointHistory" DROP CONSTRAINT "PointHistory_user_id_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "commission_amount" DECIMAL(65,30),
ADD COLUMN     "photographer_amount" DECIMAL(65,30),
ADD COLUMN     "platform_fee_percentage" DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLike" ADD CONSTRAINT "PhotoLike_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "PortfolioImage"("image_id") ON DELETE CASCADE ON UPDATE CASCADE;
