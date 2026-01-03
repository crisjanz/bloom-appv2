import express from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const router = express.Router();
const prisma = new PrismaClient();

type NormalizedPaymentMethod = {
  type: string;
  provider: string | null;
  key: string;
  amount: number;
  displayName: string;
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CARD: 'Card',
  CASH: 'Cash',
  GIFT_CARD: 'Gift Card',
  STORE_CREDIT: 'Store Credit',
  CHECK: 'Check',
  COD: 'Collect on Delivery',
  EXTERNAL: 'External',
  UNPAID: 'No Payments',
  UNKNOWN: 'Unknown'
};

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  STRIPE: 'Stripe',
  SQUARE: 'Square',
  INTERNAL: 'In-House',
  UNKNOWN: 'Unknown'
};

const toTitleCase = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

const createPaymentMethodKey = (type?: string | null, provider?: string | null) => {
  const normalizedType = (type || 'UNKNOWN').toUpperCase();
  const normalizedProvider = (provider || '').toUpperCase();

  if (!normalizedProvider || normalizedProvider === 'INTERNAL') {
    return normalizedType;
  }

  return `${normalizedType}__${normalizedProvider}`;
};

const formatPaymentMethodDisplay = (type: string, provider?: string | null) => {
  const normalizedType = type.toUpperCase();
  if (normalizedType === 'UNPAID') {
    return PAYMENT_TYPE_LABELS.UNPAID;
  }

  const baseLabel =
    PAYMENT_TYPE_LABELS[normalizedType] ?? toTitleCase(normalizedType.replace(/_/g, ' '));

  if (!provider || provider.toUpperCase() === 'INTERNAL') {
    return baseLabel;
  }

  const providerLabel =
    PAYMENT_PROVIDER_LABELS[provider.toUpperCase()] ?? toTitleCase(provider);

  return `${baseLabel} (${providerLabel})`;
};

const parsePaymentMethodFilter = (raw: string | string[] | undefined | null) => {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value === 'ALL') return null;

  const [type, provider] = value.split('__');
  return {
    type: (type || 'UNKNOWN').toUpperCase(),
    provider: provider ? provider.toUpperCase() : undefined
  };
};

const normalizePaymentMethod = (method: any, amountOverride?: number): NormalizedPaymentMethod => {
  const type = (method?.type || 'UNKNOWN').toUpperCase();
  const provider = method?.provider ? method.provider.toUpperCase() : null;
  const key = createPaymentMethodKey(type, provider);

  const amount =
    typeof amountOverride === 'number'
      ? Math.round(amountOverride)
      : Math.round(method?.amount || 0);

  return {
    type,
    provider,
    key,
    amount,
    displayName: formatPaymentMethodDisplay(type, provider)
  };
};

const extractPaymentMethodsFromOrder = (order: any): NormalizedPaymentMethod[] => {
  if (!order?.orderPayments) return [];

  const normalized: NormalizedPaymentMethod[] = [];

  order.orderPayments.forEach((orderPayment: any) => {
    const transaction = orderPayment?.transaction;
    if (!transaction) return;

    const transactionOrderPayments = transaction.orderPayments ?? [];
    const totalAllocation = transactionOrderPayments.reduce(
      (sum: number, op: any) => sum + (op?.amount || 0),
      0
    );

    const baseAmount = orderPayment?.amount ?? 0;
    const allocationRatio =
      totalAllocation > 0 ? baseAmount / totalAllocation : 1;

    (transaction.paymentMethods ?? []).forEach((method: any) => {
      const adjustedAmount = Math.round((method?.amount || 0) * allocationRatio);
      normalized.push(normalizePaymentMethod(method, adjustedAmount));
    });
  });

  return normalized;
};

const summarizePaymentMethods = (methods: NormalizedPaymentMethod[]): string => {
  if (!methods.length) {
    return PAYMENT_TYPE_LABELS.UNPAID;
  }

  return methods.map(method => method.displayName).join(', ');
};

// GET /api/reports/sales/summary
// Returns aggregated sales data with filters
router.get('/sales/summary', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      paymentMethod,
      status,
      orderSource
    } = req.query;

    const paymentFilter = parsePaymentMethodFilter(paymentMethod as string | string[] | undefined);

    // Build where clause
    const where: any = {};

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Status filter (exclude DRAFT and CANCELLED by default)
    if (status && status !== 'ALL') {
      where.status = status;
    } else {
      where.status = {
        notIn: ['DRAFT', 'CANCELLED']
      };
    }

    // Order source filter
    if (orderSource && orderSource !== 'ALL') {
      where.orderSource = orderSource;
    }

    // Payment method filter (via PT-XXXX transactions)
    if (paymentFilter) {
      where.orderPayments = {
        some: {
          transaction: {
            paymentMethods: {
              some: {
                type: paymentFilter.type,
                ...(paymentFilter.provider ? { provider: paymentFilter.provider } : {})
              }
            }
          }
        }
      };
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItems: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        orderPayments: {
          include: {
            transaction: {
              include: {
                paymentMethods: true,
                orderPayments: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const normalizedOrders = orders.map(order => {
      const paymentMethods = extractPaymentMethodsFromOrder(order);
      return {
        ...order,
        paymentMethods,
        paymentSummary: summarizePaymentMethods(paymentMethods)
      };
    });

    // Calculate summary metrics
    const totalSales = orders.reduce((sum, order) => sum + order.paymentAmount, 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    // Calculate totals by date (for chart)
    const salesByDate: Record<string, number> = {};
    const ordersByDate: Record<string, number> = {};

    orders.forEach(order => {
      const dateKey = format(new Date(order.createdAt), 'yyyy-MM-dd');
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + order.paymentAmount;
      ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
    });

    // Convert to array format for frontend
    const dailySales = Object.entries(salesByDate).map(([date, amount]) => ({
      date,
      amount,
      orders: ordersByDate[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; amount: number }> = {};
    normalizedOrders.forEach(order => {
      if (order.paymentMethods.length === 0) {
        if (!paymentBreakdown.UNPAID) {
          paymentBreakdown.UNPAID = { count: 0, amount: 0 };
        }
        paymentBreakdown.UNPAID.count += 1;
        paymentBreakdown.UNPAID.amount += order.paymentAmount;
        return;
      }

      order.paymentMethods.forEach(method => {
        if (!paymentBreakdown[method.key]) {
          paymentBreakdown[method.key] = { count: 0, amount: 0 };
        }
        paymentBreakdown[method.key].count += 1;
        paymentBreakdown[method.key].amount += method.amount;
      });
    });

    // Order source breakdown
    const sourceBreakdown: Record<string, { count: number; amount: number }> = {};
    orders.forEach(order => {
      const source = order.orderSource || 'UNKNOWN';
      if (!sourceBreakdown[source]) {
        sourceBreakdown[source] = { count: 0, amount: 0 };
      }
      sourceBreakdown[source].count += 1;
      sourceBreakdown[source].amount += order.paymentAmount;
    });

    // Calculate tax totals
    const totalTax = orders.reduce((sum, order) => sum + order.totalTax, 0);
    const totalDeliveryFees = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + order.discount, 0);

    res.json({
      success: true,
      summary: {
        totalSales,
        orderCount,
        averageOrderValue,
        totalTax,
        totalDeliveryFees,
        totalDiscounts
      },
      dailySales,
      paymentBreakdown,
      sourceBreakdown
    });

  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({
      error: 'Failed to fetch sales summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/reports/sales/orders
// Returns filtered order list with details
router.get('/sales/orders', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      paymentMethod,
      status,
      orderSource,
      limit = '100',
      offset = '0'
    } = req.query;

    const paymentFilter = parsePaymentMethodFilter(paymentMethod as string | string[] | undefined);

    // Build where clause (same as summary)
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    } else {
      where.status = {
        notIn: ['DRAFT', 'CANCELLED']
      };
    }

    if (orderSource && orderSource !== 'ALL') {
      where.orderSource = orderSource;
    }

    if (paymentFilter) {
      where.orderPayments = {
        some: {
          transaction: {
            paymentMethods: {
              some: {
                type: paymentFilter.type,
                ...(paymentFilter.provider ? { provider: paymentFilter.provider } : {})
              }
            }
          }
        }
      };
    }

    // Fetch orders with pagination
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
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
        },
        orderPayments: {
          include: {
            transaction: {
              include: {
                paymentMethods: true,
                orderPayments: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    const normalizedOrders = orders.map(order => {
      const paymentMethods = extractPaymentMethodsFromOrder(order);
      const paymentSummary = summarizePaymentMethods(paymentMethods);
      const sanitizedOrder: any = {
        ...order,
        paymentMethods,
        paymentSummary
      };
      delete sanitizedOrder.orderPayments;
      return sanitizedOrder;
    });

    res.json({
      success: true,
      orders: normalizedOrders,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < totalCount
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

// GET /api/reports/tax/export
// Returns tax data for CSV export
router.get('/tax/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required'
      });
    }

    const where: any = {
      createdAt: {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      },
      status: {
        notIn: ['DRAFT', 'CANCELLED']
      }
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        orderPayments: {
          include: {
            transaction: {
              include: {
                paymentMethods: true,
                orderPayments: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Format data for CSV export
    const exportData = orders.map(order => {
      // Calculate subtotal (payment amount - tax)
      const subtotal = order.paymentAmount - order.totalTax;
      const paymentMethods = extractPaymentMethodsFromOrder(order);
      const paymentSummary = summarizePaymentMethods(paymentMethods);

      // Parse tax breakdown if it exists
      let gst = 0;
      let pst = 0;
      if (order.taxBreakdown && Array.isArray(order.taxBreakdown)) {
        order.taxBreakdown.forEach((tax: any) => {
          if (tax.name === 'GST') {
            gst = tax.amount || 0;
          } else if (tax.name === 'PST') {
            pst = tax.amount || 0;
          }
        });
      }

      return {
        orderNumber: order.orderNumber,
        date: format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        customerName: order.customer
          ? `${order.customer.firstName} ${order.customer.lastName}`
          : 'Guest',
        subtotal: (subtotal / 100).toFixed(2),
        gst: (gst / 100).toFixed(2),
        pst: (pst / 100).toFixed(2),
        totalTax: (order.totalTax / 100).toFixed(2),
        total: (order.paymentAmount / 100).toFixed(2),
        paymentMethod: paymentSummary,
        orderSource: order.orderSource,
        status: order.status
      };
    });

    // Calculate totals
    const totals = {
      subtotal: exportData.reduce((sum, row) => sum + parseFloat(row.subtotal), 0).toFixed(2),
      gst: exportData.reduce((sum, row) => sum + parseFloat(row.gst), 0).toFixed(2),
      pst: exportData.reduce((sum, row) => sum + parseFloat(row.pst), 0).toFixed(2),
      totalTax: exportData.reduce((sum, row) => sum + parseFloat(row.totalTax), 0).toFixed(2),
      total: exportData.reduce((sum, row) => sum + parseFloat(row.total), 0).toFixed(2)
    };

    res.json({
      success: true,
      data: exportData,
      totals,
      period: {
        start: startDate,
        end: endDate
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating tax export:', error);
    res.status(500).json({
      error: 'Failed to generate tax export',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
