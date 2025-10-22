"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function initFtdSettings() {
    try {
        // Check if settings already exist
        const existing = await prisma.ftdSettings.findFirst();
        if (existing) {
            console.log("✅ FTD settings already exist");
            return;
        }
        // Create initial settings from environment variables
        const settings = await prisma.ftdSettings.create({
            data: {
                apiKey: process.env.FTD_API_KEY || "",
                shopId: process.env.FTD_SHOP_ID || "",
                authToken: "", // Will be filled by auto-refresh
                pollingEnabled: true,
                pollingInterval: 240, // 4 minutes
                notifyOnNewOrder: true,
                notifyPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
                notifyEmail: process.env.SENDGRID_FROM_EMAIL,
            },
        });
        console.log("✅ FTD settings created successfully:", settings);
    }
    catch (error) {
        console.error("❌ Error creating FTD settings:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
initFtdSettings();
