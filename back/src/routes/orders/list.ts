import express from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all orders with filtering and search
router.get('/list', async (req, res) => {
  try {
    const {
      status,
      search,
      deliveryDateFrom,
      deliveryDateTo,
      orderDateFrom,
      orderDateTo,
      limit = 50,
      offset = 0,
      page,
      source,
      externalSource,
      dateFrom,
      dateTo
    } = req.query;

    console.log('Orders list request:', { status, search, source, externalSource, deliveryDateFrom, deliveryDateTo, orderDateFrom, orderDateTo, limit, offset });

    // Build where clause for filtering
    const where: any = {};

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status as OrderStatus;
    }

    // Order source filter (PHONE, WALKIN, EXTERNAL, WEBSITE, POS)
    if (source) {
      where.orderSource = source;
    }

    // External source filter (FTD, DOORDASH, etc.)
    if (externalSource) {
      where.externalSource = externalSource;
    }

    // Delivery date filter (support both old and new param names)
    const actualDateFrom = dateFrom || deliveryDateFrom;
    const actualDateTo = dateTo || deliveryDateTo;

    if (actualDateFrom || actualDateTo) {
      where.deliveryDate = {};
      if (actualDateFrom) {
        const fromDate = new Date(actualDateFrom as string);
        fromDate.setHours(0, 0, 0, 0);
        where.deliveryDate.gte = fromDate;
      }
      if (actualDateTo) {
        const toDate = new Date(actualDateTo as string);
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
        // Search by recipient customer name
        {
          recipientCustomer: {
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
        recipientCustomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        deliveryAddress: {
          select: {
            id: true,
            attention: true,
            address1: true,
            address2: true,
            city: true,
            province: true,
            postalCode: true,
            country: true,
            addressType: true
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
      skip: page ? (Number(page) - 1) * Number(limit) : Number(offset)
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    console.log(`Found ${orders.length} orders out of ${totalCount} total`);

    res.json({
      success: true,
      data: orders,
      total: totalCount,
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

// Get order by order number (for global search)
router.get('/by-number/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findFirst({
      where: { orderNumber: Number(orderNumber) },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order by number:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get recent website orders for notifications
router.get('/recent-web', async (req, res) => {
  try {
    const hoursAgo = parseInt(req.query.hours?.toString() || '24');
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        orderSource: 'WEBSITE',
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        orderItems: {
          select: { rowTotal: true }
        },
        deliveryFee: true,
        totalTax: true,
        customer: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Calculate grandTotal for each order
    const ordersWithTotal = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      grandTotal: order.orderItems.reduce((sum, item) => sum + item.rowTotal, 0) + order.deliveryFee + order.totalTax,
      customer: order.customer
    }));

    res.json({ orders: ordersWithTotal });
  } catch (error) {
    console.error('Error fetching recent web orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export default router;