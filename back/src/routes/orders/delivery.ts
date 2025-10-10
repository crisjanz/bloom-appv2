import express from 'express';
import { PrismaClient, OrderType, OrderStatus } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get count of future orders for the next N days
router.get('/delivery/count/future', async (req, res) => {
  try {
    const { startDate } = req.query;
    const days = parseInt(req.query.days as string) || 10;

    // Use provided start date (tomorrow from frontend)
    const tomorrowDate = new Date((startDate as string) + 'T00:00:00');

    // Calculate end date
    const endDateObj = new Date(tomorrowDate);
    endDateObj.setDate(endDateObj.getDate() + (days - 1));
    const endDateStr = endDateObj.toISOString().split('T')[0];

    // Use same date handling logic as delivery endpoint
    // Parse date strings and add time to interpret as local midnight
    const startOfRange = new Date((startDate as string) + 'T00:00:00');

    const endOfRange = new Date(endDateStr + 'T23:59:59.999');

    console.log('Future orders count request:', {
      days,
      startDate: startDate,
      endDate: endDateStr,
      startOfRange: startOfRange.toISOString(),
      endOfRange: endOfRange.toISOString()
    });

    // Count all non-completed orders in the date range
    const count = await prisma.order.count({
      where: {
        deliveryDate: {
          gte: startOfRange,
          lte: endOfRange
        },
        status: {
          notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED]
        }
      }
    });

    console.log(`Found ${count} future orders in next ${days} days (${startDate} to ${endDateStr})`);

    res.json({
      success: true,
      count,
      days,
      dateRange: {
        start: startDate,
        end: endDateStr
      }
    });

  } catch (error) {
    console.error('Error counting future orders:', error);
    res.status(500).json({
      error: 'Failed to count future orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get delivery and pickup orders for a specific date or date range
router.get('/delivery', async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    let startOfRange: Date;
    let endOfRange: Date;

    // Support date range queries (for "Future" filter)
    if (startDate && endDate) {
      // Date range mode - Add T00:00:00 to interpret as midnight in local/server timezone
      startOfRange = new Date((startDate as string) + 'T00:00:00');

      endOfRange = new Date((endDate as string) + 'T23:59:59.999');

      console.log('Delivery orders request (date range):', {
        startDate,
        endDate,
        startOfRange: startOfRange.toISOString(),
        endOfRange: endOfRange.toISOString()
      });
    } else {
      // Single date mode (default)
      const dateStr = date ? (date as string) : new Date().toISOString().split('T')[0];

      startOfRange = new Date(dateStr + 'T00:00:00');

      endOfRange = new Date(dateStr + 'T23:59:59.999');

      console.log('Delivery orders request (single date):', {
        date: dateStr,
        startOfRange: startOfRange.toISOString(),
        endOfRange: endOfRange.toISOString()
      });
    }

    // Base where clause for date filtering
    const baseWhere = {
      deliveryDate: {
        gte: startOfRange,
        lte: endOfRange
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

    // Fetch orders for delivery (all statuses except completed/cancelled)
    const forDelivery = await prisma.order.findMany({
      where: {
        ...baseWhere,
        type: OrderType.DELIVERY,
        status: {
          notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED]
        }
      },
      include: includeRelations,
      orderBy: [
        { deliveryTime: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Fetch orders for pickup (all statuses except completed/cancelled)
    const forPickup = await prisma.order.findMany({
      where: {
        ...baseWhere,
        type: OrderType.PICKUP,
        status: {
          notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED]
        }
      },
      include: includeRelations,
      orderBy: [
        { deliveryTime: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Fetch completed orders (completed, cancelled, or rejected)
    const completed = await prisma.order.findMany({
      where: {
        ...baseWhere,
        status: {
          in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED]
        }
      },
      include: includeRelations,
      orderBy: [
        { updatedAt: 'desc' } // Most recent completion first
      ]
    });

    console.log(`Found delivery orders: ${forDelivery.length} for delivery, ${forPickup.length} for pickup, ${completed.length} completed`);

    // Build response based on query type
    const responseData: any = {
      success: true,
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
    };

    // Include date info based on query type
    if (startDate && endDate) {
      responseData.dateRange = {
        start: startDate,
        end: endDate
      };
    } else {
      responseData.date = (date as string) || new Date().toISOString().split('T')[0];
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;