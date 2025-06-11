import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BatchRequest {
  quantity: number;
  type: 'PHYSICAL' | 'DIGITAL';
}

// Generate random card number like "GC-X7K9-M3R8"
const generateCardNumber = (): string => {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  const segments = [];
  
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return `GC-${segments.join('-')}`;
};

export const createBatch = async (req: Request, res: Response) => {
  try {
    const { quantity = 100, type = 'PHYSICAL' }: BatchRequest = req.body;

    if (quantity < 1 || quantity > 1000) {
      return res.status(400).json({
        error: 'Quantity must be between 1 and 1000'
      });
    }

    const cards = [];
    const cardNumbers = new Set<string>(); // Ensure uniqueness

    // Generate unique card numbers
    while (cardNumbers.size < quantity) {
      const cardNumber = generateCardNumber();
      
      // Check if it already exists in database
      const existing = await prisma.giftCard.findUnique({
        where: { cardNumber }
      });
      
      if (!existing) {
        cardNumbers.add(cardNumber);
      }
    }

    // Create all cards in batch
    for (const cardNumber of cardNumbers) {
      cards.push({
        cardNumber,
        type,
        status: 'INACTIVE',
        initialValue: 0,
        currentBalance: 0
      });
    }

    const result = await prisma.giftCard.createMany({
      data: cards
    });

    // Return the card numbers for printing
    const createdCards = Array.from(cardNumbers).map(cardNumber => ({
      cardNumber,
      type,
      status: 'INACTIVE'
    }));

    return res.status(201).json({
      success: true,
      message: `Created ${result.count} gift cards`,
      cards: createdCards
    });

  } catch (error) {
    console.error('Error creating gift card batch:', error);
    return res.status(500).json({
      error: 'Failed to create gift card batch'
    });
  }
};