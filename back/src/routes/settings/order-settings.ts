import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  ORDER_NUMBER_PREFIX_PATTERN,
  normalizeOrderNumberPrefix,
  parseShopSettings,
} from '../../utils/orderNumberSettings';

const router = express.Router();
const prisma = new PrismaClient();

const orderSettingsSchema = z.object({
  orderNumberPrefix: z
    .string()
    .trim()
    .max(5, 'Prefix must be 5 characters or fewer')
    .regex(ORDER_NUMBER_PREFIX_PATTERN, 'Prefix must be alphanumeric')
    .default(''),
});

router.get('/', async (_req, res) => {
  try {
    const shopProfile = await prisma.shopProfile.findFirst({
      select: { settings: true },
    });

    const settings = parseShopSettings(shopProfile?.settings);
    const orderNumberPrefix = normalizeOrderNumberPrefix(settings.orderNumberPrefix);

    res.json({ orderNumberPrefix });
  } catch (error) {
    console.error('Error fetching order settings:', error);
    res.status(500).json({ error: 'Failed to fetch order settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { orderNumberPrefix } = orderSettingsSchema.parse(req.body ?? {});

    const shopProfile = await prisma.shopProfile.findFirst({
      select: { id: true, settings: true },
    });

    const existingSettings = parseShopSettings(shopProfile?.settings);
    const nextSettings = {
      ...existingSettings,
      orderNumberPrefix,
    };

    if (shopProfile?.id) {
      await prisma.shopProfile.update({
        where: { id: shopProfile.id },
        data: { settings: nextSettings },
      });
    } else {
      await prisma.shopProfile.create({
        data: { settings: nextSettings },
      });
    }

    res.json({ orderNumberPrefix });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid order settings payload' });
    }

    console.error('Error updating order settings:', error);
    res.status(500).json({ error: 'Failed to update order settings' });
  }
});

export default router;
