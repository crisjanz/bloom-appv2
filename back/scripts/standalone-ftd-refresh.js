#!/usr/bin/env node
/**
 * Standalone FTD Token Refresh Script
 *
 * This script can run on ANY Mac without the bloom-app repo.
 * Just copy this single file and run it!
 *
 * Requirements:
 * - Node.js 18+
 * - npm packages: puppeteer, pg
 *
 * Setup:
 * 1. Copy this file to your Mac
 * 2. Run: npm install puppeteer pg
 * 3. Set environment variable:
 *    export PROD_DATABASE_URL="postgresql://..."
 * 4. Run: node standalone-ftd-refresh.js
 */

const readline = require('readline');

// Check if puppeteer is installed
let puppeteer;
let pg;

try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('❌ Puppeteer not installed. Run: npm install puppeteer');
  process.exit(1);
}

try {
  pg = require('pg');
} catch (e) {
  console.error('❌ pg (PostgreSQL) not installed. Run: npm install pg');
  process.exit(1);
}

const { Client } = pg;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function refreshToken() {
  console.log("\n🌸 FTD Token Refresh Tool (Standalone)\n");
  console.log("This will:");
  console.log("1. Open Mercury HQ in Chrome");
  console.log("2. Extract the auth token");
  console.log("3. Upload to PRODUCTION database\n");

  // Check for database URL
  const DATABASE_URL = process.env.PROD_DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ Error: PROD_DATABASE_URL environment variable not set\n");
    console.log("To fix this:");
    console.log("1. Get your database URL from Render dashboard");
    console.log("2. Run this command (or add to ~/.zshrc):");
    console.log('   export PROD_DATABASE_URL="postgresql://..."');
    console.log("");
    process.exit(1);
  }

  const confirm = await question("Continue? (y/n): ");
  if (confirm.toLowerCase() !== 'y') {
    console.log("❌ Cancelled");
    rl.close();
    process.exit(0);
  }

  let browser;
  let dbClient;

  try {
    console.log("\n🚀 Launching Chrome...");
    browser = await puppeteer.launch({
      headless: false, // Show browser
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
            const accessToken = cacheMap.get('accessToken');
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
              const accessToken = cacheMap.get('accessToken');
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
        rl.close();
        process.exit(1);
      }
    }

    console.log(`\n✅ Token extracted: ${token.substring(0, 50)}...`);

    // Connect to database
    console.log("\n📤 Connecting to PRODUCTION database...");
    dbClient = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Render uses SSL
    });

    await dbClient.connect();
    console.log("✅ Connected to database");

    // Update token
    const result = await dbClient.query(
      `UPDATE ftd_settings SET "authToken" = $1, "tokenRefreshedAt" = NOW() RETURNING id`,
      [token]
    );

    if (result.rowCount > 0) {
      console.log("✅ Token uploaded successfully!");
      console.log(`   Updated ${result.rowCount} record(s) in production`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
    } else {
      console.warn("⚠️  No FTD settings record found to update");
      console.log("   Please configure FTD settings in the admin panel first");
    }

    await browser.close();
    await dbClient.end();
    console.log("\n🎉 Done! Your production FTD integration is now refreshed.\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (browser) await browser.close().catch(() => {});
    if (dbClient) await dbClient.end().catch(() => {});
    rl.close();
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
refreshToken();
