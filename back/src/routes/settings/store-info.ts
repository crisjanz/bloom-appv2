import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/settings/store-info
export async function getStoreInfo(req: Request, res: Response) {
  try {
    const settings = await prisma.storeSettings.findFirst();
    
    // If no settings exist, return defaults
    if (!settings) {
      return res.json({
        storeName: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "CA",
        taxId: "",
        currency: "CAD",
        timezone: "America/Vancouver",
        logoUrl: ""
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch store settings:', error);
    res.status(500).json({ error: 'Failed to fetch store settings' });
  }
}

// POST /api/settings/store-info
export async function saveStoreInfo(req: Request, res: Response) {
  try {
    const data = req.body;
    
    // Use upsert - update if exists, create if doesn't
    const settings = await prisma.storeSettings.upsert({
      where: { 
        id: await getOrCreateSettingsId() 
      },
      update: {
        storeName: data.storeName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        taxId: data.taxId,
        currency: data.currency,
        timezone: data.timezone || "America/Vancouver",
        logoUrl: data.logoUrl,
      },
      create: {
        storeName: data.storeName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country || "CA",
        taxId: data.taxId,
        currency: data.currency || "CAD",
        timezone: data.timezone || "America/Vancouver",
        logoUrl: data.logoUrl,
      },
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Failed to save store settings:', error);
    res.status(500).json({ error: 'Failed to save store settings' });
  }
}

// Helper function to get existing settings ID or generate one
async function getOrCreateSettingsId(): Promise<string> {
  const existing = await prisma.storeSettings.findFirst();
  return existing?.id || 'store_settings_singleton';
}
