import express from "express";
import { PrismaClient } from "@prisma/client";
import { refreshFtdToken, updateFtdToken } from "../../services/ftdAuthService";
import { startFtdMonitor, stopFtdMonitor } from "../../services/ftdMonitor";

const router = express.Router();
const prisma = new PrismaClient();

// Get FTD settings
router.get("/", async (req, res) => {
  try {
    let settings = await prisma.ftdSettings.findFirst();

    if (!settings) {
      // Create default settings
      settings = await prisma.ftdSettings.create({
        data: {
          apiKey: process.env.FTD_API_KEY || "",
          shopId: process.env.FTD_SHOP_ID || "71-0215AA",
          pollingEnabled: false, // Disabled by default until configured
        },
      });
    }

    // Mask sensitive data
    const masked = {
      ...settings,
      apiKey: settings.apiKey ? `${settings.apiKey.slice(0, 8)}...` : "",
      authToken: settings.authToken ? "••••••••" : null,
    };

    res.json({ success: true, settings: masked });
  } catch (error: any) {
    console.error("Error fetching FTD settings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update FTD settings
router.put("/", async (req, res) => {
  try {
    const {
      apiKey,
      shopId,
      pollingEnabled,
      pollingInterval,
      notifyOnNewOrder,
      notifyPhoneNumber,
      notifyEmail,
    } = req.body;

    // Get existing settings
    let settings = await prisma.ftdSettings.findFirst();

    if (!settings) {
      // Create if doesn't exist
      settings = await prisma.ftdSettings.create({
        data: {
          apiKey: apiKey || "",
          shopId: shopId || "71-0215AA",
          pollingEnabled: pollingEnabled !== undefined ? pollingEnabled : false,
          pollingInterval: pollingInterval || 240,
          notifyOnNewOrder: notifyOnNewOrder !== undefined ? notifyOnNewOrder : true,
          notifyPhoneNumber: notifyPhoneNumber || null,
          notifyEmail: notifyEmail || null,
        },
      });
    } else {
      // Update existing
      settings = await prisma.ftdSettings.update({
        where: { id: settings.id },
        data: {
          ...(apiKey !== undefined && { apiKey }),
          ...(shopId !== undefined && { shopId }),
          ...(pollingEnabled !== undefined && { pollingEnabled }),
          ...(pollingInterval !== undefined && { pollingInterval }),
          ...(notifyOnNewOrder !== undefined && { notifyOnNewOrder }),
          ...(notifyPhoneNumber !== undefined && { notifyPhoneNumber }),
          ...(notifyEmail !== undefined && { notifyEmail }),
        },
      });
    }

    // Restart monitor if polling settings changed
    if (pollingEnabled !== undefined || pollingInterval !== undefined) {
      if (settings.pollingEnabled) {
        console.log("🔄 Restarting FTD monitor with new settings...");
        await stopFtdMonitor();
        await startFtdMonitor();
      } else {
        await stopFtdMonitor();
      }
    }

    // Mask sensitive data
    const masked = {
      ...settings,
      apiKey: settings.apiKey ? `${settings.apiKey.slice(0, 8)}...` : "",
      authToken: settings.authToken ? "••••••••" : null,
    };

    res.json({ success: true, settings: masked });
  } catch (error: any) {
    console.error("Error updating FTD settings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually refresh auth token
router.post("/refresh-token", async (req, res) => {
  try {
    const success = await refreshFtdToken();

    if (success) {
      res.json({ success: true, message: "Token refreshed successfully" });
    } else {
      res.status(500).json({ success: false, error: "Token refresh failed" });
    }
  } catch (error: any) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually set auth token (for when Puppeteer can't auto-extract)
router.post("/set-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: "Token is required" });
    }

    await updateFtdToken(token);

    res.json({ success: true, message: "Token updated successfully" });
  } catch (error: any) {
    console.error("Error setting token:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
