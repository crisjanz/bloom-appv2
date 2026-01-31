import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { formatCurrency } from '../../utils/currency';
import { emailService } from '../../services/emailService';

const prisma = new PrismaClient();

interface PurchaseRequest {
  cards: Array<{
    cardNumber?: string; // For physical cards (preprinted)
    amount: number; // Amount in cents
    type: 'PHYSICAL' | 'DIGITAL';
    recipientEmail?: string; // For digital cards
    recipientName?: string;
    message?: string;
  }>;
  purchasedBy?: string;
  purchaserEmail?: string;
  employeeId?: string;
  orderId?: string;
  bloomCustomerId?: string;
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
      purchaserEmail,
      employeeId, 
      orderId 
    }: PurchaseRequest = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        error: 'Cards array is required'
      });
    }

    const minAmountCents = 2500;
    const maxAmountCents = 30000;
    const normalizedCards = cards.map((card) => ({
      ...card,
      amountCents: Number.isFinite(Number(card.amount)) ? Math.round(Number(card.amount)) : NaN
    }));

    // Validate each card
    for (const card of normalizedCards) {
      if (!Number.isFinite(card.amountCents) || card.amountCents < minAmountCents || card.amountCents > maxAmountCents) {
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
      for (const cardData of normalizedCards) {
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
              initialValue: cardData.amountCents,
              currentBalance: cardData.amountCents,
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
              initialValue: cardData.amountCents,
              currentBalance: cardData.amountCents,
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
            amount: cardData.amountCents,
            balanceAfter: cardData.amountCents,
            notes: `Gift card purchased for ${formatCurrency(cardData.amountCents)}`,
            employeeId,
            orderId
          }
        });

        purchasedCards.push({
          cardNumber,
          amount: cardData.amountCents,
          type: cardData.type,
          recipientEmail: cardData.recipientEmail,
          recipientName: cardData.recipientName,
          message: cardData.message,
          status: 'ACTIVE'
        });
      }
    });

    // 📧 Send email for digital gift cards
    for (const card of purchasedCards) {
      if (card.type === 'DIGITAL' && card.recipientEmail) {
        console.log('📧 Sending digital gift card email to:', card.recipientEmail);
        try {
          const emailSent = await emailService.sendGiftCardEmail({
            recipientEmail: card.recipientEmail,
            recipientName: card.recipientName || 'Gift Card Recipient',
            giftCardNumber: card.cardNumber,
            amount: card.amount / 100,
            purchaserName: purchasedBy,
            message: card.message,
            redeemUrl: 'https://bloomflowershop.com' // Update when website is live
          });
          
          if (emailSent) {
            console.log('✅ Digital gift card email sent successfully');
          } else {
            console.log('❌ Failed to send digital gift card email');
          }
        } catch (error) {
          console.error('❌ Error sending digital gift card email:', error);
          // Don't fail the whole purchase if email fails
        }
      }
    }

    // 📧 Send receipt email to purchaser
    if (purchaserEmail && purchasedCards.length > 0) {
      try {
        const totalAmountCents = purchasedCards.reduce((sum, card) => sum + card.amount, 0);
        await emailService.sendGiftCardReceiptEmail({
          purchaserEmail,
          purchaserName: purchasedBy || 'Customer',
          cards: purchasedCards.map((card) => ({
            recipientName: card.recipientName || 'Gift Card Recipient',
            recipientEmail: card.recipientEmail,
            amount: card.amount / 100,
            cardNumber: card.cardNumber,
          })),
          totalAmount: totalAmountCents / 100,
        });
        console.log('✅ Gift card receipt sent to purchaser:', purchaserEmail);
      } catch (error) {
        console.error('❌ Error sending gift card receipt to purchaser:', error);
      }
    }

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
