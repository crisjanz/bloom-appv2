import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getGiftCards = async (req: Request, res: Response) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [cards, total] = await Promise.all([
      prisma.giftCard.findMany({
        where,
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.giftCard.count({ where })
    ]);

    return res.json({
      cards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching gift cards:', error);
    return res.status(500).json({
      error: 'Failed to fetch gift cards'
    });
  }
};

export const getGiftCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const card = await prisma.giftCard.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Gift card not found'
      });
    }

    return res.json(card);

  } catch (error) {
    console.error('Error fetching gift card:', error);
    return res.status(500).json({
      error: 'Failed to fetch gift card'
    });
  }
};