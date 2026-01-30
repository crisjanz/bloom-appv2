import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const DeactivateSchema = z.object({
  employeeId: z.string().optional(),
  notes: z.string().optional()
});

export const deactivateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeId, notes } = DeactivateSchema.parse(req.body ?? {});

    const card = await prisma.giftCard.findUnique({
      where: { id }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Gift card not found'
      });
    }

    if (card.status !== 'ACTIVE') {
      return res.status(400).json({
        error: `Gift card is ${card.status.toLowerCase()}`
      });
    }

    const updatedCard = await prisma.$transaction(async (tx) => {
      const nextCard = await tx.giftCard.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: nextCard.id,
          type: 'DEACTIVATION',
          amount: 0,
          balanceAfter: nextCard.currentBalance,
          notes: notes?.trim() || 'Gift card deactivated',
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

    console.error('Error deactivating gift card:', error);
    return res.status(500).json({
      error: 'Failed to deactivate gift card'
    });
  }
};
