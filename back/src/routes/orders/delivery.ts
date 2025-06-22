import express from 'express';
import { PrismaClient, OrderType, OrderStatus } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get delivery and pickup orders for a specific date
router.get('/delivery', async (req, res) => {
  try {
    const { date } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Set time to start and end of day for proper date filtering
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Delivery orders request:', { 
      date: targetDate.toISOString().split('T')[0],
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    // Base where clause for date filtering
    const baseWhere = {
      deliveryDate: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    // Include related data for all queries
    const includeRelations = {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          address1: true,
          address2: true,
          city: true,
          province: true,
          postalCode: true,
          country: true
        }
      },
      orderItems: {
        select: {
          id: true,
          customName: true,
          unitPrice: true,
          quantity: true,
          rowTotal: true
        }
      }
    };

    // Fetch orders for delivery (READY or OUT_FOR_DELIVERY status)
    const forDelivery = await prisma.order.findMany({
      where: {
        ...baseWhere,
        type: OrderType.DELIVERY,
        status: {
          in: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]
        }
      },
      include: includeRelations,
      orderBy: [
        { deliveryTime: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Fetch orders for pickup (READY status)
    const forPickup = await prisma.order.findMany({
      where: {
        ...baseWhere,
        type: OrderType.PICKUP,
        status: OrderStatus.READY
      },
      include: includeRelations,
      orderBy: [
        { deliveryTime: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Fetch completed orders (delivered/picked up)
    const completed = await prisma.order.findMany({
      where: {
        ...baseWhere,
        status: OrderStatus.COMPLETED
      },
      include: includeRelations,
      orderBy: [
        { updatedAt: 'desc' } // Most recent completion first
      ]
    });

    console.log(`Found delivery orders: ${forDelivery.length} for delivery, ${forPickup.length} for pickup, ${completed.length} completed`);

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      orders: {
        forDelivery,
        forPickup,
        completed
      },
      summary: {
        totalForDelivery: forDelivery.length,
        totalForPickup: forPickup.length,
        totalCompleted: completed.length,
        totalPending: forDelivery.length + forPickup.length
      }
    });

  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;