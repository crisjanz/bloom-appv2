import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PurchaseRequest {
  cards: Array<{
    cardNumber?: string; // For physical cards (preprinted)
    amount: number;
    type: 'PHYSICAL' | 'DIGITAL';
    recipientEmail?: string; // For digital cards
    recipientName?: string;
    message?: string;
  }>;
  purchasedBy?: string;
  employeeId?: string;
  orderId?: string;
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

const ensureUniqueCardNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 100) { // Prevent infinite loops
    const cardNumber = generateCardNumber();
    const existing = await prisma.giftCard.findUnique({
      where: { cardNumber }
    });
    
    if (!existing) {
      return cardNumber;
    }
    attempts++;
  }
  throw new Error('Unable to generate unique card number');
};

export const purchaseCards = async (req: Request, res: Response) => {
  try {
    const { 
      cards, 
      purchasedBy, 
      employeeId, 
      orderId 
    }: PurchaseRequest = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        error: 'Cards array is required'
      });
    }

    // Validate each card
    for (const card of cards) {
      if (!card.amount || card.amount < 25 || card.amount > 300) {
        return res.status(400).json({
          error: 'Each card amount must be between $25 and $300'
        });
      }

      // Digital cards require recipient email
      if (card.type === 'DIGITAL' && !card.recipientEmail) {
        return res.status(400).json({
          error: 'Digital cards require recipient email'
        });
      }

      // Physical cards require card number (digital cards get auto-generated numbers)
      if (card.type === 'PHYSICAL' && !card.cardNumber) {
        return res.status(400).json({
          error: 'Physical cards require card number'
        });
      }
    }

    const purchasedCards: any[] = [];

    // Process each card in a transaction
    await prisma.$transaction(async (tx) => {
      for (const cardData of cards) {
        let cardNumber = cardData.cardNumber;
        let existingCard = null;

        if (cardData.type === 'PHYSICAL' && cardNumber) {
          // Physical card - find existing inactive card
          existingCard = await tx.giftCard.findUnique({
            where: { cardNumber: cardNumber.toUpperCase() }
          });

          if (!existingCard) {
            throw new Error(`Physical gift card ${cardNumber} not found`);
          }

          if (existingCard.status !== 'INACTIVE') {
            throw new Error(`Gift card ${cardNumber} is already ${existingCard.status.toLowerCase()}`);
          }

          // Activate existing card
          const updatedCard = await tx.giftCard.update({
            where: { cardNumber: cardNumber.toUpperCase() },
            data: {
              status: 'ACTIVE',
              initialValue: cardData.amount,
              currentBalance: cardData.amount,
              purchasedBy,
              recipientEmail: cardData.recipientEmail,
              recipientName: cardData.recipientName,
              message: cardData.message
            }
          });

          cardNumber = updatedCard.cardNumber;

        } else {
          // Digital card - generate new card number
          cardNumber = await ensureUniqueCardNumber();

          // Create new active card
          const newCard = await tx.giftCard.create({
            data: {
              cardNumber,
              type: cardData.type,
              status: 'ACTIVE',
              initialValue: cardData.amount,
              currentBalance: cardData.amount,
              purchasedBy,
              recipientEmail: cardData.recipientEmail,
              recipientName: cardData.recipientName,
              message: cardData.message
            }
          });

          cardNumber = newCard.cardNumber;
        }

        // Create purchase transaction
        await tx.giftCardTransaction.create({
          data: {
            giftCardId: existingCard?.id || (await tx.giftCard.findUnique({ where: { cardNumber } }))!.id,
            type: 'PURCHASE',
            amount: cardData.amount,
            balanceAfter: cardData.amount,
            notes: `Gift card purchased for $${cardData.amount}`,
            employeeId,
            orderId
          }
        });

        purchasedCards.push({
          cardNumber,
          amount: cardData.amount,
          type: cardData.type,
          recipientEmail: cardData.recipientEmail,
          recipientName: cardData.recipientName,
          message: cardData.message,
          status: 'ACTIVE'
        });
      }
    });

    return res.status(201).json({
      success: true,
      message: `Successfully purchased ${purchasedCards.length} gift card(s)`,
      cards: purchasedCards
    });

  } catch (error) {
    console.error('Error purchasing gift cards:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to purchase gift cards'
    });
  }
};