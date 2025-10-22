#!/usr/bin/env ts-node
/**
 * FTD Token Refresh Script (Local)
 *
 * Run this on your Mac to refresh the FTD token and upload to production DB
 * Usage: npm run refresh-ftd-token
 */

import puppeteer from "puppeteer";
import { PrismaClient } from "@prisma/client";
import * as readline from 'readline';

// Connect to PRODUCTION database from environment variable
const DATABASE_URL = process.env.PROD_DATABASE_URL;

if (!DATABASE_URL) {
  console.error("\n❌ Error: PROD_DATABASE_URL environment variable not set");
  console.log("\nTo fix this:");
  console.log("1. Get your database URL from Render dashboard");
  console.log("2. Add to your shell profile (~/.zshrc or ~/.bash_profile):");
  console.log('   export PROD_DATABASE_URL="postgresql://..."');
  console.log("3. Restart terminal or run: source ~/.zshrc");
  console.log("\n");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function refreshToken() {
  console.log("\n🌸 FTD Token Refresh Tool\n");
  console.log("This will:");
  console.log("1. Open Mercury HQ in Chrome");
  console.log("2. Extract the auth token");
  console.log("3. Upload to PRODUCTION database\n");

  const confirm = await question("Continue? (y/n): ");
  if (confirm.toLowerCase() !== 'y') {
    console.log("❌ Cancelled");
    process.exit(0);
  }

  try {
    console.log("\n🚀 Launching Chrome...");
    const browser = await puppeteer.launch({
      headless: false, // Show browser so you can see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log("🌐 Opening Mercury HQ...");
    await page.goto("https://mercuryhq.com/orders", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Check if already logged in
    console.log("🔍 Checking for existing session...");
    let token = await page.evaluate(() => {
      // Try multiple token storage locations
      const authCacheRaw = localStorage.getItem('AuthTokenCache');
      if (authCacheRaw) {
        try {
          const authCache = JSON.parse(authCacheRaw);
          if (Array.isArray(authCache)) {
            const cacheMap = new Map(authCache);
            const accessToken = cacheMap.get('accessToken') as { value?: string } | undefined;
            if (accessToken?.value) return accessToken.value;
          }
        } catch (e) {}
      }
      return localStorage.getItem("ep-authorization") ||
             sessionStorage.getItem("ep-authorization") ||
             null;
    });

    if (token) {
      console.log("✅ Token found! (already logged in)");
    } else {
      console.log("\n⚠️  Not logged in - please log in manually in the browser window");
      console.log("Press Enter after you've logged in...");
      await question("");

      // Try to get token again after login
      token = await page.evaluate(() => {
        const authCacheRaw = localStorage.getItem('AuthTokenCache');
        if (authCacheRaw) {
          try {
            const authCache = JSON.parse(authCacheRaw);
            if (Array.isArray(authCache)) {
              const cacheMap = new Map(authCache);
              const accessToken = cacheMap.get('accessToken') as { value?: string } | undefined;
              if (accessToken?.value) return accessToken.value;
            }
          } catch (e) {}
        }
        return localStorage.getItem("ep-authorization") ||
               sessionStorage.getItem("ep-authorization") ||
               null;
      });

      if (!token) {
        console.error("❌ Could not find token after login");
        await browser.close();
        process.exit(1);
      }
    }

    console.log(`\n✅ Token extracted: ${token.substring(0, 50)}...`);

    // Update production database
    console.log("\n📤 Uploading token to PRODUCTION database...");

    const result = await prisma.ftdSettings.updateMany({
      data: {
        authToken: token,
        tokenRefreshedAt: new Date(),
      },
    });

    if (result.count > 0) {
      console.log("✅ Token uploaded successfully!");
      console.log(`   Updated ${result.count} record(s) in production`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
    } else {
      console.warn("⚠️  No FTD settings record found to update");
      console.log("   Please configure FTD settings in the admin panel first");
    }

    await browser.close();
    console.log("\n🎉 Done! Your production FTD integration is now refreshed.\n");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

refreshToken();
