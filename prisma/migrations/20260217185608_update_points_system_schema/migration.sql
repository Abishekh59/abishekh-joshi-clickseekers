-- AlterTable
ALTER TABLE "Reward" ALTER COLUMN "total_points" SET DEFAULT 0,
ALTER COLUMN "total_points" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PointHistory" (
    "history_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "PhotoSave" (
    "save_id" SERIAL NOT NULL,
    "image_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoSave_pkey" PRIMARY KEY ("save_id")
);

-- CreateIndex
CREATE INDEX "PhotoSave_image_id_idx" ON "PhotoSave"("image_id");

-- CreateIndex
CREATE INDEX "PhotoSave_user_id_idx" ON "PhotoSave"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoSave_image_id_user_id_key" ON "PhotoSave"("image_id", "user_id");

-- AddForeignKey
ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Reward"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSave" ADD CONSTRAINT "PhotoSave_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSave" ADD CONSTRAINT "PhotoSave_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "PortfolioImage"("image_id") ON DELETE CASCADE ON UPDATE CASCADE;
