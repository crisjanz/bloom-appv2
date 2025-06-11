import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RedeemRequest {
  cardNumber: string;
  amount: number;
  orderId?: string;
  employeeId?: string;
}

export const redeemCard = async (req: Request, res: Response) => {
  try {
    const { cardNumber, amount, orderId, employeeId }: RedeemRequest = req.body;

    if (!cardNumber || !amount) {
      return res.status(400).json({
        error: 'Card number and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than zero'
      });
    }

    const card = await prisma.giftCard.findUnique({
      where: { cardNumber: cardNumber.toUpperCase() }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found'
      });
    }

    if (card.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Gift card is ${card.status.toLowerCase()}`
      });
    }

    if (card.currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: $${card.currentBalance.toFixed(2)}`
      });
    }

    // Process redemption in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newBalance = card.currentBalance - amount;
      const newStatus = newBalance === 0 ? 'USED' : 'ACTIVE';

      // Update card balance
      const updatedCard = await tx.giftCard.update({
        where: { cardNumber: cardNumber.toUpperCase() },
        data: {
          currentBalance: newBalance,
          status: newStatus
        }
      });

      // Create redemption transaction
      const transaction = await tx.giftCardTransaction.create({
        data: {
          giftCardId: updatedCard.id,
          type: 'REDEMPTION',
          amount: -amount, // Negative for redemption
          balanceAfter: newBalance,
          notes: `Redeemed $${amount.toFixed(2)}`,
          orderId,
          employeeId
        }
      });

      return { updatedCard, transaction };
    });

    return res.json({
      success: true,
      message: `$${amount.toFixed(2)} redeemed successfully`,
      amountRedeemed: amount,
      remainingBalance: result.updatedCard.currentBalance,
      cardNumber: result.updatedCard.cardNumber
    });

  } catch (error) {
    console.error('Error redeeming gift card:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to redeem gift card'
    });
  }
};