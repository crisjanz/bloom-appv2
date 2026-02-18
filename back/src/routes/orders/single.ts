import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get single order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Fetching order:', id);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: {
          include: {
            product: {
              select: {
                images: true
              }
            }
          }
        },
        orderImages: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      console.log('Order not found:', id);
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    console.log('Order found:', order.id, 'with', order.orderItems.length, 'items');

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      error: 'Failed to fetch order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
