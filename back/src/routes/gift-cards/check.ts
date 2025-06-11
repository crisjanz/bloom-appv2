import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckRequest {
  cardNumber: string;
}

export const checkBalance = async (req: Request, res: Response) => {
  try {
    const { cardNumber }: CheckRequest = req.body;

    if (!cardNumber) {
      return res.status(400).json({
        error: 'Card number is required'
      });
    }

    const card = await prisma.giftCard.findUnique({
      where: { cardNumber: cardNumber.toUpperCase() },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 transactions
        }
      }
    });

    if (!card) {
      return res.status(404).json({
        valid: false,
        error: 'Gift card not found'
      });
    }

    if (card.status === 'INACTIVE') {
      return res.status(400).json({
        valid: false,
        error: 'Gift card has not been activated'
      });
    }

    if (card.status === 'CANCELLED' || card.status === 'EXPIRED') {
      return res.status(400).json({
        valid: false,
        error: `Gift card is ${card.status.toLowerCase()}`
      });
    }

    return res.json({
      valid: true,
      cardNumber: card.cardNumber,
      balance: card.currentBalance,
      initialValue: card.initialValue,
      status: card.status,
      createdAt: card.createdAt,
      recentTransactions: card.transactions
    });

  } catch (error) {
    console.error('Error checking gift card balance:', error);
    return res.status(500).json({
      valid: false,
      error: 'Failed to check gift card balance'
    });
  }
};