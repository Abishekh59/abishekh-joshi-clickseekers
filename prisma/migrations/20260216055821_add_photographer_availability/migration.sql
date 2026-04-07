-- CreateTable
CREATE TABLE "PhotographerAvailability" (
    "availability_id" SERIAL NOT NULL,
    "photographer_id" UUID NOT NULL,
    "blocked_date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotographerAvailability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateIndex
CREATE INDEX "PhotographerAvailability_photographer_id_idx" ON "PhotographerAvailability"("photographer_id");

-- CreateIndex
CREATE INDEX "PhotographerAvailability_blocked_date_idx" ON "PhotographerAvailability"("blocked_date");

-- CreateIndex
CREATE UNIQUE INDEX "PhotographerAvailability_photographer_id_blocked_date_key" ON "PhotographerAvailability"("photographer_id", "blocked_date");

-- AddForeignKey
ALTER TABLE "PhotographerAvailability" ADD CONSTRAINT "PhotographerAvailability_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
