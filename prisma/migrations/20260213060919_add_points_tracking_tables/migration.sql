/*
  Warnings:

  - Added the required column `photographer_id` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "event_type" TEXT;

-- AlterTable
ALTER TABLE "PortfolioImage" ADD COLUMN     "comments_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "photographer_id" UUID NOT NULL,
ADD COLUMN     "replied_at" TIMESTAMP(3),
ADD COLUMN     "reply_text" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "location" TEXT,
ADD COLUMN     "specialization" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "comment_id" SERIAL NOT NULL,
    "image_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "comment_text" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "PhotoLike" (
    "like_id" SERIAL NOT NULL,
    "image_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoLike_pkey" PRIMARY KEY ("like_id")
);

-- CreateTable
CREATE TABLE "PhotographerSave" (
    "save_id" SERIAL NOT NULL,
    "photographer_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotographerSave_pkey" PRIMARY KEY ("save_id")
);

-- CreateTable
CREATE TABLE "LoginTracking" (
    "tracking_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_streak_days" INTEGER NOT NULL DEFAULT 1,
    "longest_streak_days" INTEGER NOT NULL DEFAULT 1,
    "total_logins" INTEGER NOT NULL DEFAULT 1,
    "last_streak_bonus" TIMESTAMP(3),
    "last_monthly_bonus" TIMESTAMP(3),

    CONSTRAINT "LoginTracking_pkey" PRIMARY KEY ("tracking_id")
);

-- CreateTable
CREATE TABLE "WeeklyUploadTracking" (
    "tracking_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "upload_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyUploadTracking_pkey" PRIMARY KEY ("tracking_id")
);

-- CreateIndex
CREATE INDEX "Comment_image_id_idx" ON "Comment"("image_id");

-- CreateIndex
CREATE INDEX "Comment_user_id_idx" ON "Comment"("user_id");

-- CreateIndex
CREATE INDEX "Comment_parent_id_idx" ON "Comment"("parent_id");

-- CreateIndex
CREATE INDEX "PhotoLike_image_id_idx" ON "PhotoLike"("image_id");

-- CreateIndex
CREATE INDEX "PhotoLike_user_id_idx" ON "PhotoLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoLike_image_id_user_id_key" ON "PhotoLike"("image_id", "user_id");

-- CreateIndex
CREATE INDEX "PhotographerSave_photographer_id_idx" ON "PhotographerSave"("photographer_id");

-- CreateIndex
CREATE INDEX "PhotographerSave_client_id_idx" ON "PhotographerSave"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "PhotographerSave_photographer_id_client_id_key" ON "PhotographerSave"("photographer_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "LoginTracking_user_id_key" ON "LoginTracking"("user_id");

-- CreateIndex
CREATE INDEX "WeeklyUploadTracking_user_id_idx" ON "WeeklyUploadTracking"("user_id");

-- CreateIndex
CREATE INDEX "WeeklyUploadTracking_week_start_idx" ON "WeeklyUploadTracking"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyUploadTracking_user_id_week_start_key" ON "WeeklyUploadTracking"("user_id", "week_start");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "PortfolioImage"("image_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Comment"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLike" ADD CONSTRAINT "PhotoLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotographerSave" ADD CONSTRAINT "PhotographerSave_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginTracking" ADD CONSTRAINT "LoginTracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyUploadTracking" ADD CONSTRAINT "WeeklyUploadTracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
