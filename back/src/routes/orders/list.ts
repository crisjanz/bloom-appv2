import express from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all orders with filtering and search
router.get('/list', async (req, res) => {
  try {
    const { status, search, deliveryDateFrom, deliveryDateTo, orderDateFrom, orderDateTo, limit = 50, offset = 0 } = req.query;

    console.log('Orders list request:', { status, search, deliveryDateFrom, deliveryDateTo, orderDateFrom, orderDateTo, limit, offset });

    // Build where clause for filtering
    const where: any = {};

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status as OrderStatus;
    }

    // Delivery date filter
    if (deliveryDateFrom || deliveryDateTo) {
      where.deliveryDate = {};
      if (deliveryDateFrom) {
        const fromDate = new Date(deliveryDateFrom as string);
        fromDate.setHours(0, 0, 0, 0);
        where.deliveryDate.gte = fromDate;
      }
      if (deliveryDateTo) {
        const toDate = new Date(deliveryDateTo as string);
        toDate.setHours(23, 59, 59, 999);
        where.deliveryDate.lte = toDate;
      }
    }

    // Order date filter (createdAt)
    if (orderDateFrom || orderDateTo) {
      where.createdAt = {};
      if (orderDateFrom) {
        const fromDate = new Date(orderDateFrom as string);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (orderDateTo) {
        const toDate = new Date(orderDateTo as string);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Search filter
    if (search) {
      const searchTerm = search as string;
      where.OR = [
        // Search by order number (if it's a number)
        ...(isNaN(Number(searchTerm)) ? [] : [{
          id: {
            equals: searchTerm
          }
        }]),
        // Search by customer name
        {
          customer: {
            OR: [
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              }
            ]
          }
        },
        // Search by recipient name
        {
          recipient: {
            OR: [
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              }
            ]
          }
        }
      ];
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
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
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      },
      take: Number(limit),
      skip: Number(offset)
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    console.log(`Found ${orders.length} orders out of ${totalCount} total`);

    res.json({
      success: true,
      orders,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;