import { Router } from 'express';
import { OrderStatus, OrderType, PaymentTransactionStatus } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();

// Helper: Get start of today (midnight)
function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Helper: Get start of yesterday
function getStartOfYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

// Helper: Calculate percentage change
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

router.get('/metrics', async (req, res) => {
  try {
    const today = getStartOfToday();
    const yesterday = getStartOfYesterday();
    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const pendingStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.IN_DESIGN,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY
    ];

    // Run all queries in parallel for speed
    const [
      todayRevenue,
      yesterdayRevenue,
      ordersPending,
      ordersOverdue,
      deliveriesToday,
      thisWeekCustomers,
      lastWeekCustomers
    ] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where: {
          createdAt: { gte: today },
          status: PaymentTransactionStatus.COMPLETED
        },
        _sum: { totalAmount: true }
      }),
      prisma.paymentTransaction.aggregate({
        where: {
          createdAt: { gte: yesterday, lt: today },
          status: PaymentTransactionStatus.COMPLETED
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.count({
        where: {
          status: { in: pendingStatuses }
        }
      }),
      prisma.order.count({
        where: {
          deliveryDate: { lt: today },
          status: {
            in: pendingStatuses
          }
        }
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: {
          type: OrderType.DELIVERY,
          deliveryDate: {
            gte: today,
            lt: endOfToday
          }
        },
        _count: true
      }),
      prisma.customer.count({
        where: {
          createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
            lt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const deliveryByStatus = {
      DELIVERED: 0,
      OUT_FOR_DELIVERY: 0,
      PREPARING: 0
    };

    deliveriesToday.forEach((group) => {
      if (group.status === OrderStatus.COMPLETED) {
        deliveryByStatus.DELIVERED = group._count;
      } else if (group.status === OrderStatus.OUT_FOR_DELIVERY) {
        deliveryByStatus.OUT_FOR_DELIVERY = group._count;
      } else if (
        group.status === OrderStatus.READY ||
        group.status === OrderStatus.IN_DESIGN ||
        group.status === OrderStatus.PAID
      ) {
        deliveryByStatus.PREPARING += group._count;
      }
    });

    const todayAmount = todayRevenue._sum.totalAmount ?? 0;
    const yesterdayAmount = yesterdayRevenue._sum.totalAmount ?? 0;
    const deliveryTotal = deliveriesToday.reduce((sum, g) => sum + g._count, 0);

    res.json({
      todayRevenue: {
        amount: todayAmount,
        percentChange: calculatePercentChange(todayAmount, yesterdayAmount)
      },
      ordersPending: {
        count: ordersPending,
        overdue: ordersOverdue
      },
      deliveriesToday: {
        total: deliveryTotal,
        byStatus: deliveryByStatus
      },
      newCustomers: {
        thisWeek: thisWeekCustomers,
        percentChange: calculatePercentChange(thisWeekCustomers, lastWeekCustomers)
      }
    });
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

router.get('/revenue-trend', async (req, res) => {
  try {
    const daysParam = parseInt(req.query.days as string, 10);
    const days = Number.isNaN(daysParam) || daysParam <= 0 ? 7 : Math.min(daysParam, 90);

    const startDate = getStartOfToday();
    startDate.setDate(startDate.getDate() - (days - 1));

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        createdAt: { gte: startDate },
        status: PaymentTransactionStatus.COMPLETED
      },
      select: {
        totalAmount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const revenueByDate: Record<string, number> = {};

    transactions.forEach((tx) => {
      const dateKey = tx.createdAt.toISOString().split('T')[0];
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + tx.totalAmount;
    });

    const result: Array<{ date: string; revenue: number }> = [];
    const cursor = new Date(startDate);

    for (let i = 0; i < days; i += 1) {
      const dateKey = cursor.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        revenue: revenueByDate[dateKey] || 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch revenue trend:', error);
    res.status(500).json({ error: 'Failed to fetch revenue trend' });
  }
});

export default router;
