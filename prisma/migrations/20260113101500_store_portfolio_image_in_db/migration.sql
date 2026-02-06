-- Store portfolio images in DB instead of filesystem

ALTER TABLE "PortfolioImage"
  ADD COLUMN IF NOT EXISTS "image_data" BYTEA,
  ADD COLUMN IF NOT EXISTS "mime_type" TEXT,
  ADD COLUMN IF NOT EXISTS "original_name" TEXT;

ALTER TABLE "PortfolioImage"
  ALTER COLUMN "image_url" DROP NOT NULL;
