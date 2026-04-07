-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'WARNING', 'BLOCKED');

-- AlterTable: Add status column to User
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
