import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/settings/delivery-exceptions
export const getDeliveryExceptions = async (req: Request, res: Response) => {
  try {
    const exceptions = await prisma.deliveryExceptions.findFirst();
    
    // If no exceptions exist, return defaults
    if (!exceptions) {
      return res.json({
        exceptions: [],
        notes: ""
      });
    }
    
    res.json(exceptions);
  } catch (error) {
    console.error('Failed to fetch delivery exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch delivery exceptions' });
  }
};

// POST /api/settings/delivery-exceptions
export const saveDeliveryExceptions = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Validate the exceptions array format
    const exceptions = data.exceptions || [];
    
    // Use upsert - update if exists, create if doesn't
    const savedExceptions = await prisma.deliveryExceptions.upsert({
      where: { 
        id: await getOrCreateExceptionsId() 
      },
      update: {
        exceptions: exceptions, // Store as JSON array
        notes: data.notes || "",
      },
      create: {
        exceptions: exceptions, // Store as JSON array
        notes: data.notes || "",
      },
    });
    
    res.json(savedExceptions);
  } catch (error) {
    console.error('Failed to save delivery exceptions:', error);
    res.status(500).json({ error: 'Failed to save delivery exceptions' });
  }
};

// Helper function to get existing exceptions ID or generate one
async function getOrCreateExceptionsId(): Promise<string> {
  const existing = await prisma.deliveryExceptions.findFirst();
  return existing?.id || 'delivery_exceptions_singleton';
}