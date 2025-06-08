import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/settings/business-hours
export const getBusinessHours = async (req: Request, res: Response) => {
  try {
    const businessHours = await prisma.businessHoursSettings.findFirst();
    
    // If no business hours exist, return defaults
    if (!businessHours) {
      return res.json({
        timezone: "America/Vancouver",
        mondayOpen: "09:00",
        mondayClose: "17:00",
        mondayEnabled: true,
        tuesdayOpen: "09:00",
        tuesdayClose: "17:00",
        tuesdayEnabled: true,
        wednesdayOpen: "09:00",
        wednesdayClose: "17:00",
        wednesdayEnabled: true,
        thursdayOpen: "09:00",
        thursdayClose: "17:00",
        thursdayEnabled: true,
        fridayOpen: "09:00",
        fridayClose: "17:00",
        fridayEnabled: true,
        saturdayOpen: "09:00",
        saturdayClose: "17:00",
        saturdayEnabled: true,
        sundayOpen: "10:00",
        sundayClose: "16:00",
        sundayEnabled: false,
      });
    }
    
    res.json(businessHours);
  } catch (error) {
    console.error('Failed to fetch business hours:', error);
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
};

// POST /api/settings/business-hours
export const saveBusinessHours = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Use upsert - update if exists, create if doesn't
    const businessHours = await prisma.businessHoursSettings.upsert({
      where: { 
        id: await getOrCreateBusinessHoursId() 
      },
      update: {
        timezone: data.timezone,
        mondayOpen: data.mondayOpen,
        mondayClose: data.mondayClose,
        mondayEnabled: data.mondayEnabled,
        tuesdayOpen: data.tuesdayOpen,
        tuesdayClose: data.tuesdayClose,
        tuesdayEnabled: data.tuesdayEnabled,
        wednesdayOpen: data.wednesdayOpen,
        wednesdayClose: data.wednesdayClose,
        wednesdayEnabled: data.wednesdayEnabled,
        thursdayOpen: data.thursdayOpen,
        thursdayClose: data.thursdayClose,
        thursdayEnabled: data.thursdayEnabled,
        fridayOpen: data.fridayOpen,
        fridayClose: data.fridayClose,
        fridayEnabled: data.fridayEnabled,
        saturdayOpen: data.saturdayOpen,
        saturdayClose: data.saturdayClose,
        saturdayEnabled: data.saturdayEnabled,
        sundayOpen: data.sundayOpen,
        sundayClose: data.sundayClose,
        sundayEnabled: data.sundayEnabled,
      },
      create: {
        timezone: data.timezone || "America/Vancouver",
        mondayOpen: data.mondayOpen || "09:00",
        mondayClose: data.mondayClose || "17:00",
        mondayEnabled: data.mondayEnabled !== false,
        tuesdayOpen: data.tuesdayOpen || "09:00",
        tuesdayClose: data.tuesdayClose || "17:00",
        tuesdayEnabled: data.tuesdayEnabled !== false,
        wednesdayOpen: data.wednesdayOpen || "09:00",
        wednesdayClose: data.wednesdayClose || "17:00",
        wednesdayEnabled: data.wednesdayEnabled !== false,
        thursdayOpen: data.thursdayOpen || "09:00",
        thursdayClose: data.thursdayClose || "17:00",
        thursdayEnabled: data.thursdayEnabled !== false,
        fridayOpen: data.fridayOpen || "09:00",
        fridayClose: data.fridayClose || "17:00",
        fridayEnabled: data.fridayEnabled !== false,
        saturdayOpen: data.saturdayOpen || "09:00",
        saturdayClose: data.saturdayClose || "17:00",
        saturdayEnabled: data.saturdayEnabled !== false,
        sundayOpen: data.sundayOpen || "10:00",
        sundayClose: data.sundayClose || "16:00",
        sundayEnabled: data.sundayEnabled === true,
      },
    });
    
    res.json(businessHours);
  } catch (error) {
    console.error('Failed to save business hours:', error);
    res.status(500).json({ error: 'Failed to save business hours' });
  }
};

// Helper function to get existing business hours ID or generate one
async function getOrCreateBusinessHoursId(): Promise<string> {
  const existing = await prisma.businessHoursSettings.findFirst();
  return existing?.id || 'business_hours_singleton';
}