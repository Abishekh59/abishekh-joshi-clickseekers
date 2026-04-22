/**
 * Portfolio Diagnostic Tool
 *
 * This file helps diagnose why photos aren't showing in the portfolio.
 * Run this to check:
 * 1. API response structure
 * 2. Image URL population
 * 3. Missing fields in database
 */

import { storage } from "../utils/storage";
import { API_HOST, apiService } from "./api";

export interface DiagnosticResult {
  success: boolean;
  issues: string[];
  warnings: string[];
  data: {
    apiResponseCount: number;
    imagesWithUrls: number;
    imagesWithoutUrls: number;
    sampleImages: any[];
    apiHost: string;
  };
}

export async function diagnosePortfolioIssues(): Promise<DiagnosticResult> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const result: DiagnosticResult = {
    success: true,
    issues,
    warnings,
    data: {
      apiResponseCount: 0,
      imagesWithUrls: 0,
      imagesWithoutUrls: 0,
      sampleImages: [],
      apiHost: API_HOST,
    },
  };

  try {
    // Get token
    const token = await storage.getToken();
    if (!token) {
      issues.push("No authentication token found");
      result.success = false;
      return result;
    }

    console.log("[Diagnostic] Token found, fetching portfolio...");

    // Fetch portfolio images
    const res = await apiService.getMyPortfolioImages(token);

    if (!res.success) {
      issues.push(`API returned success: false`);
      result.success = false;
      return result;
    }

    if (!res.data || res.data.length === 0) {
      warnings.push(
        "No images in portfolio (might be normal if uploading first time)",
      );
      result.data.apiResponseCount = 0;
      return result;
    }

    result.data.apiResponseCount = res.data.length;

    // Analyze images
    res.data.forEach((img, index) => {
      // Check image_url field
      if (!img.image_url) {
        result.data.imagesWithoutUrls++;
        if (index < 3) {
          result.data.sampleImages.push({
            index,
            id: img.image_id,
            title: img.title,
            image_url: "[MISSING]",
            portfolio_id: img.portfolio_id,
            created_at: img.created_at,
          });
        }
      } else {
        result.data.imagesWithUrls++;
        if (index < 3) {
          result.data.sampleImages.push({
            index,
            id: img.image_id,
            title: img.title,
            image_url: img.image_url.substring(0, 100) + "...",
            portfolio_id: img.portfolio_id,
            created_at: img.created_at,
          });
        }
      }

      // Check required fields
      if (!img.title) warnings.push(`Image ${img.image_id} missing title`);
      if (!img.portfolio_id)
        warnings.push(`Image ${img.image_id} missing portfolio_id`);
      if (!img.created_at)
        warnings.push(`Image ${img.image_id} missing created_at`);
    });

    // Critical issues
    if (result.data.imagesWithoutUrls > 0) {
      issues.push(
        `${result.data.imagesWithoutUrls}/${res.data.length} images are missing image_url field. ` +
          `This is the ROOT CAUSE of photos not showing. Backend needs to populate image_url on upload.`,
      );
    }

    if (result.data.imagesWithUrls === 0 && result.data.imagesWithoutUrls > 0) {
      result.success = false;
    }
  } catch (err: any) {
    issues.push(`Error during diagnostic: ${err?.message}`);
    result.success = false;
  }

  return result;
}

/**
 * Print diagnostic results in human-readable format
 */
export function printDiagnostic(result: DiagnosticResult): void {
  console.log("\n========== PORTFOLIO DIAGNOSTIC REPORT ==========\n");

  console.log(`Overall Status: ${result.success ? "✓ OK" : "✗ ISSUES FOUND"}`);
  console.log(`API Host: ${result.data.apiHost}`);
  console.log(`Total Images: ${result.data.apiResponseCount}`);

  if (result.data.apiResponseCount > 0) {
    console.log(`  - With image_url: ${result.data.imagesWithUrls}`);
    console.log(`  - Without image_url: ${result.data.imagesWithoutUrls}`);
  }

  if (result.issues.length > 0) {
    console.log("\n⚠️  ISSUES (Must Fix):");
    result.issues.forEach((issue) => console.log(`  • ${issue}`));
  }

  if (result.warnings.length > 0) {
    console.log("\n⚠️  WARNINGS:");
    result.warnings.forEach((warning) => console.log(`  • ${warning}`));
  }

  if (result.data.sampleImages.length > 0) {
    console.log("\n📸 Sample Images:");
    result.data.sampleImages.forEach((img) => {
      console.log(`  [${img.index}] ${img.title} (ID: ${img.id})`);
      console.log(`      image_url: ${img.image_url}`);
    });
  }

  console.log("\n=== TROUBLESHOOTING ===\n");

  if (result.data.imagesWithoutUrls > 0) {
    console.log("ROOT CAUSE: Backend is not populating the image_url field");
    console.log("SOLUTION: ");
    console.log("  1. Check backend portfolio upload endpoint");
    console.log("  2. Ensure image_url is saved to database after file upload");
    console.log("  3. Verify S3/file storage is working correctly");
    console.log("  4. Check that getMyPortfolioImages returns image_url field");
  }

  console.log("\n================================================\n");
}
