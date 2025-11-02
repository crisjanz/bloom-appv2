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
  seasonalProducts: [],
  featuredCategoryIds: [],
};

// Helper to get or create settings
async function getOrCreateSettings() {
  let settings = await prisma.homepageSettings.findFirst();

  if (!settings) {
    settings = await prisma.homepageSettings.create({
      data: DEFAULT_SETTINGS,
    });
  }

  return settings;
}

// Get current homepage settings
router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching homepage settings:', error);
    res.status(500).json({ error: 'Could not fetch homepage settings' });
  }
});

// Update homepage settings
router.put('/', async (req, res) => {
  const { announcementBanner, seasonalProducts, featuredCategoryIds } = req.body;

  try {
    // Ensure settings exist
    const existingSettings = await getOrCreateSettings();

    // Build update data with only provided fields
    const updateData: any = {};
    if (announcementBanner !== undefined) updateData.announcementBanner = announcementBanner;
    if (seasonalProducts !== undefined) updateData.seasonalProducts = seasonalProducts;
    if (featuredCategoryIds !== undefined) updateData.featuredCategoryIds = featuredCategoryIds;

    const updatedSettings = await prisma.homepageSettings.update({
      where: { id: existingSettings.id },
      data: updateData,
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating homepage settings:', error);
    res.status(500).json({ error: 'Could not update homepage settings' });
  }
});

// Get all homepage banners (ordered by position)
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.homepageBanner.findMany({
      orderBy: { position: 'asc' },
    });

    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Could not fetch banners' });
  }
});

// Update a specific banner by ID
router.put('/banners/:id', async (req, res) => {
  const { id } = req.params;
  const { title, details, buttonText, link, imageUrl, isActive } = req.body;

  try {
    const updatedBanner = await prisma.homepageBanner.update({
      where: { id },
      data: { title, details, buttonText, link, imageUrl, isActive },
    });

    res.json(updatedBanner);
  } catch (error) {
    res.status(500).json({ error: 'Could not update banner' });
  }
});

export default router;
