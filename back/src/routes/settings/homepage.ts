import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Default values for new settings
const DEFAULT_SETTINGS = {
  announcementBanner: {
    message: '',
    bgColor: '#f8d7da',
    textColor: '#721c24',
    fontSize: 'base',
    fontWeight: 'normal',
    isActive: false,
    link: '',
  },
};

// Helper to get or create settings
async function getOrCreateSettings() {
  let settings = await prisma.homepageSettings.findFirst();

  if (!settings) {
    settings = await prisma.homepageSettings.create({
      data: {
        announcementBanner: DEFAULT_SETTINGS.announcementBanner,
        seasonalProducts: [],
        featuredCategoryIds: [],
      },
    });
  }

  return settings;
}

// Get current homepage settings (announcement banner only)
router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching homepage settings:', error);
    res.status(500).json({ error: 'Could not fetch homepage settings' });
  }
});

// Update announcement banner
router.put('/', async (req, res) => {
  const { announcementBanner } = req.body;

  try {
    const existingSettings = await getOrCreateSettings();

    const updatedSettings = await prisma.homepageSettings.update({
      where: { id: existingSettings.id },
      data: { announcementBanner },
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating homepage settings:', error);
    res.status(500).json({ error: 'Could not update homepage settings' });
  }
});

export default router;
