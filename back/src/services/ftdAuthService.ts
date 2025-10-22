import puppeteer from "puppeteer";
import { PrismaClient } from "@prisma/client";
import { setAuthToken } from "./ftdMonitor";

const prisma = new PrismaClient();

let refreshInterval: NodeJS.Timeout | null = null;

export async function refreshFtdToken(): Promise<boolean> {
  console.log("🔄 Attempting to refresh FTD auth token...");

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000,
    });

    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Navigate to Mercury HQ
    console.log("🌐 Loading Mercury HQ dashboard...");
    await page.goto("https://mercuryhq.com/orders", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Check if we're already logged in by looking for token
    console.log("🔍 Checking if already logged in...");
    const existingToken = await page.evaluate(() => {
      return localStorage.getItem("ep-authorization") ||
             sessionStorage.getItem("ep-authorization") ||
             null;
    });

    if (existingToken) {
      console.log("✅ Already logged in, token found!");

      // Update token in database
      await prisma.ftdSettings.updateMany({
        data: {
          authToken: existingToken,
          tokenRefreshedAt: new Date(),
        },
      });

      // Update in-memory token
      setAuthToken(existingToken);

      await browser.close();
      return true;
    }

    // Check if we're on login page
    console.log("⚠️  No token found, checking if login required...");
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      console.log("🔐 Session expired, attempting auto-login...");

      const username = process.env.FTD_MERCURY_USERNAME;
      const password = process.env.FTD_MERCURY_PASSWORD;

      if (!username || !password) {
        console.warn("⚠️  FTD_MERCURY_USERNAME or FTD_MERCURY_PASSWORD not set in .env");
        await browser.close();
        return false;
      }

      // Attempt login (adjust selectors based on actual Mercury HQ login page)
      try {
        // Wait for login form
        console.log("⏳ Waiting for login form...");
        await page.waitForSelector('input[type="email"], input[name="email"], input[type="text"]', { timeout: 10000 });

        // Fill in username/email
        console.log("✍️  Filling in email...");
        const emailInput = await page.$('input[type="email"], input[name="email"], input[type="text"]');
        if (emailInput) {
          await emailInput.click({ clickCount: 3 }); // Select all
          await emailInput.type(username);
        }

        // Fill in password
        console.log("✍️  Filling in password...");
        await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 });
        const passwordInput = await page.$('input[type="password"], input[name="password"]');
        if (passwordInput) {
          await passwordInput.click({ clickCount: 3 }); // Select all
          await passwordInput.type(password);
        }

        // Wait a moment for form validation
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try multiple strategies to find and click the submit button
        console.log("🔍 Looking for submit button...");
        let loginSuccess = false;

        // Strategy 1: Look for button with type="submit"
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          console.log("✅ Found button[type='submit']");
          await Promise.all([
            submitBtn.click(),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
          ]);
          loginSuccess = true;
        }

        // Strategy 2: Look for any button with "Sign" or "Log" text
        if (!loginSuccess) {
          console.log("🔍 Trying to find button by text content...");
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text && (text.toLowerCase().includes('sign') || text.toLowerCase().includes('log'))) {
              console.log(`✅ Found button with text: "${text}"`);
              await Promise.all([
                button.click(),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
              ]);
              loginSuccess = true;
              break;
            }
          }
        }

        // Strategy 3: Press Enter key
        if (!loginSuccess) {
          console.log("⌨️  Trying Enter key...");
          await page.keyboard.press('Enter');
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
          loginSuccess = true;
        }

        if (!loginSuccess) {
          throw new Error('Could not find login button');
        }

        console.log("✅ Login form submitted");

        // Navigate to orders page after login
        await page.goto("https://mercuryhq.com/orders", {
          waitUntil: "networkidle2",
          timeout: 30000
        });

      } catch (loginErr: any) {
        console.error("❌ Auto-login failed:", loginErr.message);
        console.log("💡 You may need to manually log into Mercury HQ once");
        await browser.close();
        return false;
      }
    }

    // Wait a bit more for the page to fully load and store tokens
    console.log("⏳ Waiting for page to load completely...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to extract token from localStorage or sessionStorage
    console.log("🔍 Searching for token in storage...");
    const storageData = await page.evaluate(() => {
      // Get all localStorage keys
      const localKeys = Object.keys(localStorage);
      const sessionKeys = Object.keys(sessionStorage);

      let foundToken = null;
      let foundKey = null;

      // Check AuthTokenCache first (Mercury HQ specific)
      const authCacheRaw = localStorage.getItem('AuthTokenCache');
      if (authCacheRaw) {
        try {
          const authCache = JSON.parse(authCacheRaw);

          // AuthTokenCache is stored as an array of [key, {value: ...}] pairs
          // Convert to Map for easier access
          if (Array.isArray(authCache)) {
            const cacheMap = new Map(authCache);

            // Try to get accessToken first
            const accessTokenEntry = cacheMap.get('accessToken') as { value?: string } | undefined;
            if (accessTokenEntry && accessTokenEntry.value) {
              foundToken = accessTokenEntry.value;
              foundKey = 'localStorage.AuthTokenCache.accessToken';
            }

            // If no accessToken, try refreshToken
            if (!foundToken) {
              const refreshTokenEntry = cacheMap.get('refreshToken') as { value?: string } | undefined;
              if (refreshTokenEntry && refreshTokenEntry.value) {
                foundToken = refreshTokenEntry.value;
                foundKey = 'localStorage.AuthTokenCache.refreshToken';
              }
            }
          }
        } catch (e) {
          console.log('⚠️ Failed to parse AuthTokenCache as JSON:', e);
        }
      }

      // Try other common token key names
      if (!foundToken) {
        const possibleTokenKeys = [
          'ep-authorization',
          'authorization',
          'auth-token',
          'token',
          'access_token',
          'accessToken'
        ];

        // Check localStorage
        for (const key of possibleTokenKeys) {
          const value = localStorage.getItem(key);
          if (value) {
            foundToken = value;
            foundKey = `localStorage.${key}`;
            break;
          }
        }

        // Check sessionStorage if not found
        if (!foundToken) {
          for (const key of possibleTokenKeys) {
            const value = sessionStorage.getItem(key);
            if (value) {
              foundToken = value;
              foundKey = `sessionStorage.${key}`;
              break;
            }
          }
        }
      }

      return {
        token: foundToken,
        tokenKey: foundKey,
        localStorageKeys: localKeys,
        sessionStorageKeys: sessionKeys,
      };
    });

    console.log(`📦 localStorage keys: ${storageData.localStorageKeys.join(', ') || '(empty)'}`);
    console.log(`📦 sessionStorage keys: ${storageData.sessionStorageKeys.join(', ') || '(empty)'}`);

    if (storageData.token) {
      console.log(`✅ Token found in ${storageData.tokenKey}`);

      await browser.close();

      // Update token in database
      await prisma.ftdSettings.updateMany({
        data: {
          authToken: storageData.token,
          tokenRefreshedAt: new Date(),
        },
      });

      // Update in-memory token
      setAuthToken(storageData.token);

      console.log("✅ FTD token refreshed successfully");
      return true;
    }

    await browser.close();
    console.warn("⚠️  Could not extract FTD token from Mercury HQ");
    console.warn("💡 Check the storage keys above to see what's available");
    return false;

  } catch (err: any) {
    console.error("❌ FTD token refresh error:", err.message);
    return false;
  }
}

// Start automatic token refresh schedule
export async function startTokenRefreshSchedule() {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Check if we need to refresh immediately
  const settings = await prisma.ftdSettings.findFirst();
  const needsRefresh = !settings?.authToken ||
                       !settings?.tokenRefreshedAt ||
                       (Date.now() - settings.tokenRefreshedAt.getTime() > 5 * 60 * 60 * 1000); // 5 hours

  if (needsRefresh) {
    console.log("🔄 Token missing or expired, refreshing now...");
    await refreshFtdToken().catch(err => {
      console.error("Initial token refresh failed:", err.message);
    });
  } else {
    console.log("✅ Valid FTD token found, skipping initial refresh");
  }

  // Schedule refresh every 6 hours
  refreshInterval = setInterval(() => {
    refreshFtdToken().catch(err => {
      console.error("Scheduled token refresh failed:", err.message);
    });
  }, 6 * 60 * 60 * 1000); // 6 hours

  console.log("🔐 FTD token auto-refresh scheduled (every 6 hours)");
}

// Stop automatic token refresh
export function stopTokenRefreshSchedule() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  console.log("🛑 FTD token auto-refresh stopped");
}

// Manual token update (for when user provides token directly)
export async function updateFtdToken(token: string): Promise<void> {
  await prisma.ftdSettings.updateMany({
    data: {
      authToken: token,
      tokenRefreshedAt: new Date(),
    },
  });

  setAuthToken(token);
  console.log("✅ FTD token updated manually");
}
