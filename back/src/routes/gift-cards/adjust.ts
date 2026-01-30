import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { formatCurrency } from '../../utils/currency';

const prisma = new PrismaClient();

const AdjustSchema = z.object({
  amount: z.preprocess((value) => Number(value), z.number().int()),
  notes: z.string().optional(),
  employeeId: z.string().optional()
});

export const adjustBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, notes, employeeId } = AdjustSchema.parse(req.body ?? {});

    if (amount === 0) {
      return res.status(400).json({
        error: 'Adjustment amount must be non-zero'
      });
    }

    const card = await prisma.giftCard.findUnique({
      where: { id }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Gift card not found'
      });
    }

    if (card.status === 'CANCELLED' || card.status === 'EXPIRED') {
      return res.status(400).json({
        error: `Gift card is ${card.status.toLowerCase()}`
      });
    }

    if (card.status === 'INACTIVE') {
      return res.status(400).json({
        error: 'Gift card must be activated before adjustments'
      });
    }

    const nextBalance = card.currentBalance + amount;
    if (nextBalance < 0) {
      return res.status(400).json({
        error: 'Adjustment would make balance negative'
      });
    }

    const formattedAmount = formatCurrency(Math.abs(amount));
    const sign = amount > 0 ? '+' : '-';
    const adjustmentNotes = notes?.trim() || `Admin adjustment (${sign}${formattedAmount})`;
    const nextStatus = nextBalance === 0 ? 'USED' : 'ACTIVE';

    const updatedCard = await prisma.$transaction(async (tx) => {
      const nextCard = await tx.giftCard.update({
        where: { id },
        data: {
          currentBalance: nextBalance,
          status: nextStatus
        }
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: nextCard.id,
          type: 'ADJUSTMENT',
          amount,
          balanceAfter: nextBalance,
          notes: adjustmentNotes,
          employeeId
        }
      });

      return nextCard;
    });

    return res.json({
      success: true,
      card: updatedCard
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors[0]?.message || 'Invalid request data'
      });
    }

    console.error('Error adjusting gift card balance:', error);
    return res.status(500).json({
      error: 'Failed to adjust gift card balance'
    });
  }
};
