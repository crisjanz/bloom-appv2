import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { formatCurrency } from '../../utils/currency';

const prisma = new PrismaClient();

interface ActivateRequest {
  cardNumber: string;
  amount: number; // Amount in cents
  purchasedBy?: string;
  employeeId?: string;
  orderId?: string;
}

export const activateCard = async (req: Request, res: Response) => {
  try {
    const { 
      cardNumber, 
      amount, 
      purchasedBy, 
      employeeId, 
      orderId 
    }: ActivateRequest = req.body;
    const amountCents = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : NaN;

    if (!cardNumber || !Number.isFinite(amountCents)) {
      return res.status(400).json({
        error: 'Card number and amount are required'
      });
    }

    if (amountCents < 1000 || amountCents > 100000) {
      return res.status(400).json({
        error: 'Amount must be between $10 and $1000'
      });
    }

    // Find the card
    const card = await prisma.giftCard.findUnique({
      where: { cardNumber: cardNumber.toUpperCase() }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Gift card not found'
      });
    }

    if (card.status !== 'INACTIVE') {
      return res.status(400).json({
        error: `Gift card is already ${card.status.toLowerCase()}`
      });
    }

    // Activate the card in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update card status and balance
      const updatedCard = await tx.giftCard.update({
        where: { cardNumber: cardNumber.toUpperCase() },
        data: {
          status: 'ACTIVE',
          initialValue: amountCents,
          currentBalance: amountCents,
          purchasedBy
        }
      });

      // Create activation transaction
      const transaction = await tx.giftCardTransaction.create({
        data: {
          giftCardId: updatedCard.id,
          type: 'ACTIVATION',
          amount: amountCents,
          balanceAfter: amountCents,
          notes: `Card activated with ${formatCurrency(amountCents)}`,
          employeeId,
          orderId
        }
      });

      return { updatedCard, transaction };
    });

    return res.json({
      success: true,
      message: `Gift card activated with ${formatCurrency(amountCents)}`,
      card: {
        cardNumber: result.updatedCard.cardNumber,
        balance: result.updatedCard.currentBalance,
        status: result.updatedCard.status
      }
    });

  } catch (error) {
    console.error('Error activating gift card:', error);
    return res.status(500).json({
      error: 'Failed to activate gift card'
    });
  }
};
