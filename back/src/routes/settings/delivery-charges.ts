import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDeliveryCharges = async (req: Request, res: Response) => {
  try {
    const [settings, zones] = await Promise.all([
      prisma.deliverySettings.findFirst(),
      prisma.deliveryZone.findMany({
        orderBy: { sortOrder: 'asc' }
      })
    ]);

    res.status(200).json({
      settings: settings || {
        storeAddress: '',
        storePostalCode: '',
        deliveryMode: 'DISTANCE',
        freeDeliveryMinimum: null,
        maxDeliveryRadius: null,
        enabled: true,
        businessHoursOnly: true,
        advanceOrderHours: 2
      },
      zones: zones || []
    });
  } catch (error) {
    console.error('Error loading delivery charges:', error);
    res.status(500).json({ error: 'Failed to load delivery charges' });
  }
};

export const saveDeliveryCharges = async (req: Request, res: Response) => {
  try {
    const { settings, zones } = req.body;

    // Upsert settings
    await prisma.deliverySettings.upsert({
      where: { id: settings.id || 'default' },
      update: {
        storeAddress: settings.storeAddress,
        storePostalCode: settings.storePostalCode,
        storeLatitude: settings.storeLatitude,
        storeLongitude: settings.storeLongitude,
        deliveryMode: settings.deliveryMode,
        freeDeliveryMinimum: settings.freeDeliveryMinimum,
        maxDeliveryRadius: settings.maxDeliveryRadius,
        enabled: settings.enabled,
        businessHoursOnly: settings.businessHoursOnly,
        advanceOrderHours: settings.advanceOrderHours
      },
      create: {
        id: 'default',
        storeAddress: settings.storeAddress,
        storePostalCode: settings.storePostalCode,
        storeLatitude: settings.storeLatitude,
        storeLongitude: settings.storeLongitude,
        deliveryMode: settings.deliveryMode,
        freeDeliveryMinimum: settings.freeDeliveryMinimum,
        maxDeliveryRadius: settings.maxDeliveryRadius,
        enabled: settings.enabled,
        businessHoursOnly: settings.businessHoursOnly,
        advanceOrderHours: settings.advanceOrderHours
      }
    });

    // Clear existing zones and recreate
    await prisma.deliveryZone.deleteMany();
    
    if (zones && zones.length > 0) {
      await prisma.deliveryZone.createMany({
        data: zones.map((zone: any, index: number) => ({
          name: zone.name,
          minDistance: zone.minDistance,
          maxDistance: zone.maxDistance,
          fee: zone.fee,
          enabled: zone.enabled,
          sortOrder: index
        }))
      });
    }

    res.status(200).json({ message: 'Delivery charges saved successfully' });
  } catch (error) {
    console.error('Error saving delivery charges:', error);
    res.status(500).json({ error: 'Failed to save delivery charges' });
  }
};