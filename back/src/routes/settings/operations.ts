import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get operations settings
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.operationsSettings.findFirst();

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.operationsSettings.create({
        data: {
          wireoutServiceFee: 1500, // $15.00
          wireoutServiceName: 'FTD',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching operations settings:', error);
    res.status(500).json({ error: 'Failed to fetch operations settings' });
  }
});

// Update operations settings
router.put('/', async (req, res) => {
  try {
    const { wireoutServiceFee, wireoutServiceName } = req.body;

    // Get existing settings or create if doesn't exist
    let settings = await prisma.operationsSettings.findFirst();

    if (settings) {
      // Update existing
      settings = await prisma.operationsSettings.update({
        where: { id: settings.id },
        data: {
          wireoutServiceFee: wireoutServiceFee !== undefined ? wireoutServiceFee : settings.wireoutServiceFee,
          wireoutServiceName: wireoutServiceName !== undefined ? wireoutServiceName : settings.wireoutServiceName,
        },
      });
    } else {
      // Create new
      settings = await prisma.operationsSettings.create({
        data: {
          wireoutServiceFee: wireoutServiceFee || 1500,
          wireoutServiceName: wireoutServiceName || 'FTD',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating operations settings:', error);
    res.status(500).json({ error: 'Failed to update operations settings' });
  }
});

export default router;
