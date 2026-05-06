/**
 * Migration script to populate missing image_url fields for portfolio images
 *
 * ========== FOR RENDER HOSTING ==========
 *
 * Usage - Option 1: Run via Render Shell
 * 1. Go to https://dashboard.render.com
 * 2. Select your service
 * 3. Click "Shell" tab
 * 4. Run: npm run migrate:images
 *
 * Usage - Option 2: Run Locally
 * 1. Copy DATABASE_URL from Render dashboard
 * 2. Set: export DATABASE_URL="your_render_db_url"
 * 3. Run: npx ts-node scripts/populate-missing-image-urls.ts
 *
 * This script:
 * 1. Finds all portfolio images with NULL or empty image_url
 * 2. Checks if the image file exists on disk
 * 3. Reconstructs the image_url as /assets/portfolio/{filename}
 * 4. Updates the database
 * 5. Reports results
 *
 * ⚠️ IMPORTANT - RENDER EPHEMERAL FILESYSTEM:
 * On Render's free tier, the filesystem is ephemeral - files are deleted on restart.
 * Only images uploaded AFTER the last restart will have files on disk.
 * This script still updates DB records, which is correct.
 */

import * as fs from "fs";
import * as path from "path";
import prisma from "../src/model/index";

const PORTFOLIO_DIR = path.join(process.cwd(), "assets", "portfolio");
const IS_RENDER = process.env.RENDER === "true";
const ENVIRONMENT = IS_RENDER ? "🚀 RENDER" : "💻 LOCAL";

async function populateMissingImageUrls() {
  console.log("\n========== PORTFOLIO IMAGE URL MIGRATION ==========");
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Portfolio directory: ${PORTFOLIO_DIR}`);
  console.log(
    `Database: ${process.env.DATABASE_URL ? "✓ Connected" : "❌ Not set"}\n`,
  );

  try {
    // Check if portfolio directory exists
    const portfolioDirExists = fs.existsSync(PORTFOLIO_DIR);
    console.log(
      `Portfolio directory exists: ${portfolioDirExists ? "✓ Yes" : "❌ No (files may not be on disk)"}\n`,
    );

    if (!portfolioDirExists && IS_RENDER) {
      console.log(
        "ℹ️  Note: On Render's ephemeral filesystem, image files are temporary.",
      );
      console.log(
        "   This is NORMAL. Database URLs will still be updated correctly.\n",
      );
    }

    // Find all images with missing or empty image_url
    console.log("Scanning database for images with missing image_url...");
    const imagesWithMissingUrls = await prisma.portfolioImage.findMany({
      where: {
        OR: [{ image_url: null }, { image_url: "" }],
      },
      orderBy: { image_id: "asc" },
    });

    console.log(
      `Found ${imagesWithMissingUrls.length} images with missing image_url\n`,
    );

    if (imagesWithMissingUrls.length === 0) {
      console.log(
        "✅ All images have image_url populated. No action needed.\n",
      );
      return;
    }

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const failedImages: any[] = [];

    // Process each image
    console.log("Processing images...\n");
    for (const img of imagesWithMissingUrls) {
      try {
        let imageUrl: string | null = null;
        let fileFoundOnDisk = false;

        // Only check files if directory exists (skip on Render ephemeral if not present)
        if (portfolioDirExists && img.original_name) {
          const possiblePaths = [
            path.join(PORTFOLIO_DIR, img.original_name),
            path.join(
              PORTFOLIO_DIR,
              `portfolio-${img.image_id}-${img.original_name}`,
            ),
          ];

          for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
              const filename = path.basename(filePath);
              imageUrl = `/assets/portfolio/${filename}`;
              fileFoundOnDisk = true;
              console.log(`  ✓ Image ${img.image_id}: Found file: ${filename}`);
              break;
            }
          }
        }

        // If file not found but we need a URL, construct it from original_name
        if (!imageUrl) {
          if (img.original_name) {
            // Try to construct from original_name
            imageUrl = `/assets/portfolio/portfolio-${img.image_id}-${img.original_name}`;

            if (!fileFoundOnDisk) {
              if (portfolioDirExists) {
                console.log(
                  `  ⚠️  Image ${img.image_id}: File not on disk, using reconstructed URL`,
                );
              } else {
                console.log(
                  `  ℹ️  Image ${img.image_id}: Constructing URL (${IS_RENDER ? "ephemeral filesystem" : "file not found"})`,
                );
              }
            }
          } else {
            // No original_name, skip this image
            console.warn(
              `  ⏭️  Image ${img.image_id}: Skipping (no original_name available)`,
            );
            skipped++;
            continue;
          }
        }

        // Update the database
        await prisma.portfolioImage.update({
          where: { image_id: img.image_id },
          data: { image_url: imageUrl },
        });

        updated++;
      } catch (err: any) {
        console.error(`  ✗ Image ${img.image_id}: ${err.message}`);
        failed++;
        failedImages.push({
          image_id: img.image_id,
          original_name: img.original_name,
          error: err.message,
        });
      }
    }

    console.log("\n========== MIGRATION COMPLETE ==========\n");
    console.log(`✅ Updated: ${updated} images`);
    console.log(`❌ Failed: ${failed} images`);
    if (skipped > 0) console.log(`⏭️  Skipped: ${skipped} images`);

    if (failedImages.length > 0) {
      console.log("\n❌ Failed Images:");
      failedImages.forEach((img) => {
        console.log(
          `   - ID: ${img.image_id}, Name: ${img.original_name}, Error: ${img.error}`,
        );
      });
    }

    console.log("\n✅ Migration completed successfully\n");

    if (IS_RENDER) {
      console.log("📌 RENDER NOTE:");
      console.log(
        "   Database has been updated. Images will display using the API fallback endpoint.",
      );
      console.log(
        "   File serving via /assets/portfolio/ works for images uploaded after last deploy.\n",
      );
    }
  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
populateMissingImageUrls();
