import { Router } from 'express';
import path from 'path';
import { Prisma, PrismaClient, PrintJobType } from '@prisma/client';
import { z } from 'zod';
import { printService } from '../../services/printService';
import { printSettingsService } from '../../services/printSettingsService';
import { houseAccountService } from '../../services/houseAccountService';
import { buildReceiptPdf } from '../../templates/receipt-pdf';
import { buildInvoicePdf } from '../../templates/invoice-pdf';
import { buildOrderTicketPdf } from '../../templates/order-ticket-pdf';
import { buildInventorySheetPdf } from '../../templates/inventory-sheet-pdf';
import { buildSalesReportPdf } from '../../templates/sales-report-pdf';
import { buildHouseAccountStatementPdf } from '../../templates/house-account-statement-pdf';
import { buildGiftCardHandoffPdf } from '../../templates/gift-card-handoff-pdf';
import { buildThermalReceipt } from '../../templates/receipt-thermal';
import { loadLocalPdf, storePdf } from '../../utils/pdfStorage';
import { buildRouteViewUrl, generateRouteToken } from '../../utils/routeToken';
import { generateOrderQRCodeBuffer } from '../../utils/qrCodeGenerator';

const router = Router();
const prisma = new PrismaClient();

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      recipientCustomer: true,
      deliveryAddress: true,
      orderItems: true,
      orderPayments: {
        include: {
          transaction: {
            include: {
              paymentMethods: true,
            },
          },
        },
      },
    },
  });
}

function getOrderTransactions(order: any) {
  const transactions = order.orderPayments?.map((op: any) => op.transaction).filter(Boolean) || [];

  // Sort: completed first, then failed/cancelled, then others
  return transactions.sort((a: any, b: any) => {
    const priority = { COMPLETED: 0, FAILED: 1, CANCELLED: 2, PROCESSING: 3, PENDING: 4 };
    return (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
  });
}

const queryBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
}, z.boolean());

const inventoryReportSchema = z.object({
  categoryId: z.string().trim().optional(),
  lowStockOnly: queryBoolean.default(false),
  sortBy: z.enum(['name', 'sku', 'stock']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const salesReportSchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  status: z.string().trim().optional(),
  orderSource: z.string().trim().optional(),
});

const houseAccountStatementSchema = z.object({
  customerId: z.string().trim().min(1),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const giftCardPrintSchema = z.object({
  customerName: z.string().trim().optional(),
  cards: z
    .array(
      z.object({
        cardNumber: z.string().trim().min(1),
        amount: z.preprocess((value) => Number(value), z.number().int().min(0)),
        type: z.enum(['PHYSICAL', 'DIGITAL']),
        recipientName: z.string().trim().optional().nullable(),
        recipientEmail: z.string().trim().optional().nullable(),
        message: z.string().trim().optional().nullable(),
      })
    )
    .min(1),
});

const LOW_STOCK_THRESHOLD = 5;

const inventoryInclude = {
  product: {
    select: {
      name: true,
      categoryId: true,
      category: {
        select: {
          name: true,
        },
      },
      categoryLinks: {
        select: {
          categoryId: true,
        },
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

const buildInventoryWhere = (filters: {
  categoryId?: string;
  lowStockOnly?: boolean;
}): Prisma.ProductVariantWhereInput => {
  const and: Prisma.ProductVariantWhereInput[] = [];

  if (filters.categoryId) {
    and.push({
      product: {
        OR: [
          { categoryId: filters.categoryId },
          { categoryLinks: { some: { categoryId: filters.categoryId } } },
        ],
      },
    });
  }

  if (filters.lowStockOnly) {
    and.push({
      trackInventory: true,
      stockLevel: {
        lte: LOW_STOCK_THRESHOLD,
      },
    });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
};

const buildInventoryOrderBy = (
  sortBy: 'name' | 'sku' | 'stock',
  sortOrder: 'asc' | 'desc'
): Prisma.ProductVariantOrderByWithRelationInput[] => {
  switch (sortBy) {
    case 'sku':
      return [{ sku: sortOrder }];
    case 'stock':
      return [{ stockLevel: sortOrder }, { sku: 'asc' }];
    case 'name':
    default:
      return [{ product: { name: sortOrder } }, { name: sortOrder }];
  }
};

const mapSortLabel = (sortBy: 'name' | 'sku' | 'stock', sortOrder: 'asc' | 'desc') => {
  const suffix = sortOrder === 'asc' ? 'A-Z' : 'Z-A';
  if (sortBy === 'sku') return `SKU (${suffix})`;
  if (sortBy === 'stock') return `Stock (${sortOrder === 'asc' ? 'Low-High' : 'High-Low'})`;
  return `Name (${suffix})`;
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
  UNKNOWN: 'Unknown',
};

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  STRIPE: 'Stripe',
  SQUARE: 'Square',
  INTERNAL: 'In-House',
  UNKNOWN: 'Unknown',
};

const toTitleCase = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

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
    provider: provider ? provider.toUpperCase() : undefined,
  };
};

const normalizePaymentMethod = (method: any, amountOverride?: number) => {
  const type = (method?.type || 'UNKNOWN').toUpperCase();
  const provider = method?.provider ? method.provider.toUpperCase() : null;
  const key = createPaymentMethodKey(type, provider);

  const amount =
    typeof amountOverride === 'number' ? Math.round(amountOverride) : Math.round(method?.amount || 0);

  return {
    type,
    provider,
    key,
    amount,
    displayName: formatPaymentMethodDisplay(type, provider),
  };
};

const extractPaymentMethodsFromOrder = (order: any) => {
  if (!order?.orderPayments) return [];

  const normalized: Array<ReturnType<typeof normalizePaymentMethod>> = [];

  order.orderPayments.forEach((orderPayment: any) => {
    const transaction = orderPayment?.transaction;
    if (!transaction) return;

    const transactionOrderPayments = transaction.orderPayments ?? [];
    const totalAllocation = transactionOrderPayments.reduce(
      (sum: number, op: any) => sum + (op?.amount || 0),
      0
    );

    const baseAmount = orderPayment?.amount ?? 0;
    const allocationRatio = totalAllocation > 0 ? baseAmount / totalAllocation : 1;

    (transaction.paymentMethods ?? []).forEach((method: any) => {
      const adjustedAmount = Math.round((method?.amount || 0) * allocationRatio);
      normalized.push(normalizePaymentMethod(method, adjustedAmount));
    });
  });

  return normalized;
};

const summarizePaymentMethods = (methods: Array<ReturnType<typeof normalizePaymentMethod>>) => {
  if (!methods.length) {
    return PAYMENT_TYPE_LABELS.UNPAID;
  }

  return methods.map((method) => method.displayName).join(', ');
};

const formatLabel = (value?: string | null) => {
  if (!value || value === 'UNKNOWN') {
    return 'Unknown';
  }
  if (value === 'ALL') {
    return 'All';
  }
  return toTitleCase(value.replace(/[_\s]/g, ' '));
};

async function respondWithDocumentPrint(params: {
  res: any;
  config: { destination: string };
  pdfBuffer: Buffer;
  template: string;
  fileLabel: string;
  jobData: Record<string, any>;
  priority?: number;
}) {
  const { res, config, pdfBuffer, template, fileLabel, jobData, priority } = params;

  if (config.destination === 'browser') {
    const stored = await storePdf(pdfBuffer, fileLabel);
    return res.json({ action: 'browser-print', pdfUrl: stored.url });
  }

  const result = await printService.queuePrintJob({
    type: PrintJobType.REPORT,
    order: {
      ...jobData,
      pdfBase64: pdfBuffer.toString('base64'),
    } as any,
    template,
    priority: priority ?? 5,
  });

  return res.json(result);
}

router.get('/pdf/:fileName', async (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName);
    const filePath = await loadLocalPdf(fileName);
    if (!filePath) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ error: 'Failed to serve PDF' });
  }
});

router.post('/receipt/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await loadOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const config = await printSettingsService.getConfigForType(PrintJobType.RECEIPT);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.RECEIPT });
    }

    const orderWithTransactions = {
      ...order,
      transactions: getOrderTransactions(order),
    };

    if (config.destination === 'browser') {
      const pdfBuffer = await buildReceiptPdf(orderWithTransactions);
      const stored = await storePdf(pdfBuffer, `receipt-${order.orderNumber ?? order.id}`);
      return res.json({ action: 'browser-print', pdfUrl: stored.url });
    }

    const jobData: any = { ...orderWithTransactions };
    let template = 'receipt-pdf-v1';

    if (config.destination === 'receipt-agent') {
      const thermalBuffer = await buildThermalReceipt(orderWithTransactions);
      jobData.thermalCommands = thermalBuffer.toString('base64');
      template = 'receipt-thermal-v1';
    } else {
      const pdfBuffer = await buildReceiptPdf(orderWithTransactions);
      jobData.pdfBase64 = pdfBuffer.toString('base64');
    }

    const result = await printService.queuePrintJob({
      type: PrintJobType.RECEIPT,
      orderId: order.id,
      order: jobData,
      template,
      priority: 10,
    });

    res.json(result);
  } catch (error) {
    console.error('Error printing receipt:', error);
    res.status(500).json({ error: 'Failed to print receipt' });
  }
});

router.post('/invoice/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await loadOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const config = await printSettingsService.getConfigForType(PrintJobType.REPORT);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.REPORT });
    }

    if (config.destination === 'browser') {
      const pdfBuffer = await buildInvoicePdf(order);
      const stored = await storePdf(pdfBuffer, `invoice-${order.orderNumber ?? order.id}`);
      return res.json({ action: 'browser-print', pdfUrl: stored.url });
    }

    const pdfBuffer = await buildInvoicePdf(order);
    const jobData: any = {
      ...order,
      pdfBase64: pdfBuffer.toString('base64'),
    };

    const result = await printService.queuePrintJob({
      type: PrintJobType.REPORT,
      orderId: order.id,
      order: jobData,
      template: 'invoice-pdf-v1',
      priority: 5,
    });

    res.json(result);
  } catch (error) {
    console.error('Error printing invoice:', error);
    res.status(500).json({ error: 'Failed to print invoice' });
  }
});

router.post('/order-ticket/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await loadOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const config = await printSettingsService.getConfigForType(PrintJobType.ORDER_TICKET);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.ORDER_TICKET });
    }

    if (config.destination === 'browser') {
      let qrBuffer: Buffer | null = null;
      try {
        const token = generateRouteToken(order.id);
        const driverRouteUrl = buildRouteViewUrl(token);
        qrBuffer = await generateOrderQRCodeBuffer(driverRouteUrl);
      } catch (error) {
        console.error('Failed to generate driver route QR for order ticket:', error);
      }

      const pdfBuffer = await buildOrderTicketPdf(order, { qrCodeBuffer: qrBuffer });
      const stored = await storePdf(pdfBuffer, `order-ticket-${order.orderNumber ?? order.id}`);
      return res.json({ action: 'browser-print', pdfUrl: stored.url });
    }

    const result = await printService.queuePrintJob({
      type: PrintJobType.ORDER_TICKET,
      orderId: order.id,
      order: order as any,
      template: 'delivery-ticket-v1',
      priority: 10,
    });

    res.json(result);
  } catch (error) {
    console.error('Error printing order ticket:', error);
    res.status(500).json({ error: 'Failed to print order ticket' });
  }
});

router.post('/sales-report', async (req, res) => {
  try {
    const filters = salesReportSchema.parse(req.body ?? {});
    const paymentFilter = parsePaymentMethodFilter(filters.paymentMethod);

    const where: any = {};

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    } else {
      where.status = {
        notIn: ['DRAFT', 'CANCELLED'],
      };
    }

    if (filters.orderSource && filters.orderSource !== 'ALL') {
      where.orderSource = filters.orderSource;
    }

    if (paymentFilter) {
      where.orderPayments = {
        some: {
          transaction: {
            paymentMethods: {
              some: {
                type: paymentFilter.type,
                ...(paymentFilter.provider ? { provider: paymentFilter.provider } : {}),
              },
            },
          },
        },
      };
    }

    const config = await printSettingsService.getConfigForType(PrintJobType.REPORT);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.REPORT });
    }

    const [orders, storeSettings] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          orderItems: {
            select: {
              id: true,
            },
          },
          orderPayments: {
            include: {
              transaction: {
                include: {
                  paymentMethods: true,
                  orderPayments: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.storeSettings.findFirst({ select: { storeName: true } }),
    ]);

    const totalSales = orders.reduce((sum, order) => sum + (order.paymentAmount || 0), 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount ? Math.round(totalSales / orderCount) : 0;
    const totalTax = orders.reduce((sum, order) => sum + (order.totalTax || 0), 0);
    const totalDeliveryFees = orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

    const paymentBreakdownMap = new Map<string, { label: string; amount: number; count: number }>();
    const sourceBreakdownMap = new Map<string, { label: string; amount: number; count: number }>();

    const ordersForPrint = orders.map((order) => {
      const paymentMethods = extractPaymentMethodsFromOrder(order);
      const paymentSummary = summarizePaymentMethods(paymentMethods);

      if (paymentMethods.length === 0) {
        const label = PAYMENT_TYPE_LABELS.UNPAID;
        const existing = paymentBreakdownMap.get('UNPAID') || { label, amount: 0, count: 0 };
        existing.count += 1;
        paymentBreakdownMap.set('UNPAID', existing);
      } else {
        paymentMethods.forEach((method) => {
          const existing = paymentBreakdownMap.get(method.key) || {
            label: method.displayName,
            amount: 0,
            count: 0,
          };
          existing.amount += method.amount;
          existing.count += 1;
          paymentBreakdownMap.set(method.key, existing);
        });
      }

      const sourceKey = order.orderSource || 'UNKNOWN';
      const sourceLabel = formatLabel(order.orderSource);
      const sourceEntry = sourceBreakdownMap.get(sourceKey) || { label: sourceLabel, amount: 0, count: 0 };
      sourceEntry.amount += order.paymentAmount || 0;
      sourceEntry.count += 1;
      sourceBreakdownMap.set(sourceKey, sourceEntry);

      const customerName = order.customer
        ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Guest'
        : 'Guest';

      return {
        createdAt: order.createdAt,
        orderNumber: order.orderNumber ?? null,
        customerName,
        paymentSummary,
        totalAmount: order.paymentAmount || 0,
      };
    });

    const paymentBreakdown = Array.from(paymentBreakdownMap.values()).sort((a, b) => b.amount - a.amount);
    const sourceBreakdown = Array.from(sourceBreakdownMap.values()).sort((a, b) => b.amount - a.amount);

    const paymentMethodLabel = paymentFilter
      ? formatPaymentMethodDisplay(paymentFilter.type, paymentFilter.provider)
      : 'All';
    const statusLabel = filters.status && filters.status !== 'ALL' ? formatLabel(filters.status) : 'All';
    const sourceLabel = filters.orderSource && filters.orderSource !== 'ALL' ? formatLabel(filters.orderSource) : 'All';

    const pdfBuffer = await buildSalesReportPdf({
      shopName: storeSettings?.storeName || 'In Your Vase Flowers',
      generatedAt: new Date(),
      filters: {
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        paymentMethod: paymentMethodLabel,
        status: statusLabel,
        orderSource: sourceLabel,
      },
      summary: {
        totalSales,
        orderCount,
        averageOrderValue,
        totalTax,
        totalDeliveryFees,
        totalDiscounts,
      },
      paymentBreakdown,
      sourceBreakdown,
      orders: ordersForPrint,
    });

    return respondWithDocumentPrint({
      res,
      config,
      pdfBuffer,
      template: 'sales-report-pdf-v1',
      fileLabel: 'sales-report',
      jobData: {
        reportType: 'sales',
        filters,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
    }
    console.error('Error printing sales report:', error);
    res.status(500).json({ error: 'Failed to print sales report' });
  }
});

router.post('/house-account-statement', async (req, res) => {
  try {
    const payload = houseAccountStatementSchema.parse(req.body ?? {});

    const config = await printSettingsService.getConfigForType(PrintJobType.REPORT);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.REPORT });
    }

    const [statement, storeSettings] = await Promise.all([
      houseAccountService.generateStatement({
        customerId: payload.customerId,
        from: payload.from,
        to: payload.to,
      }),
      prisma.storeSettings.findFirst({
        select: {
          storeName: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
        },
      }),
    ]);

    const pdfBuffer = await buildHouseAccountStatementPdf({
      statement,
      storeInfo: storeSettings || null,
      generatedAt: new Date(),
    });

    return respondWithDocumentPrint({
      res,
      config,
      pdfBuffer,
      template: 'house-account-statement-pdf-v1',
      fileLabel: `house-account-${payload.customerId}`,
      jobData: {
        reportType: 'house-account',
        customerId: payload.customerId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
    }
    console.error('Error printing house account statement:', error);
    res.status(500).json({ error: 'Failed to print house account statement' });
  }
});

router.post('/inventory-report', async (req, res) => {
  try {
    const query = inventoryReportSchema.parse(req.body ?? {});
    const config = await printSettingsService.getConfigForType(PrintJobType.REPORT);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.REPORT });
    }

    const where = buildInventoryWhere(query);
    const orderBy = buildInventoryOrderBy(query.sortBy, query.sortOrder);

    const [variants, storeSettings, category] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: inventoryInclude,
        orderBy,
      }),
      prisma.storeSettings.findFirst({ select: { storeName: true } }),
      query.categoryId
        ? prisma.category.findUnique({
            where: { id: query.categoryId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const sheetItems = variants.map((variant) => ({
      sku: variant.sku,
      productName: variant.product?.name || 'Unnamed Product',
      variantName: variant.name || '',
      currentStock: variant.stockLevel,
      trackInventory: variant.trackInventory,
    }));

    const pdfBuffer = await buildInventorySheetPdf(sheetItems, {
      shopName: storeSettings?.storeName || 'In Your Vase Flowers',
      generatedAt: new Date(),
      categoryName: category?.name || null,
      lowStockOnly: query.lowStockOnly,
      sortLabel: mapSortLabel(query.sortBy, query.sortOrder),
    });

    return respondWithDocumentPrint({
      res,
      config,
      pdfBuffer,
      template: 'inventory-count-sheet-pdf-v1',
      fileLabel: 'inventory-count-sheet',
      jobData: {
        reportType: 'inventory-count',
        filters: query,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
    }
    console.error('Error printing inventory report:', error);
    res.status(500).json({ error: 'Failed to print inventory report' });
  }
});

router.post('/gift-cards', async (req, res) => {
  try {
    const payload = giftCardPrintSchema.parse(req.body ?? {});
    const config = await printSettingsService.getConfigForType(PrintJobType.REPORT);
    if (!config.enabled) {
      return res.json({ action: 'skipped', reason: 'disabled', type: PrintJobType.REPORT });
    }

    const storeSettings = await prisma.storeSettings.findFirst({
      select: { storeName: true },
    });

    const pdfBuffer = await buildGiftCardHandoffPdf({
      shopName: storeSettings?.storeName || 'In Your Vase Flowers',
      generatedAt: new Date(),
      customerName: payload.customerName || null,
      cards: payload.cards.map((card) => ({
        cardNumber: card.cardNumber,
        amount: card.amount,
        type: card.type,
        recipientName: card.recipientName || null,
        recipientEmail: card.recipientEmail || null,
        message: card.message || null,
      })),
    });

    return respondWithDocumentPrint({
      res,
      config,
      pdfBuffer,
      template: 'gift-card-handoff-pdf-v1',
      fileLabel: 'gift-card-handoff',
      jobData: {
        reportType: 'gift-card-handoff',
        customerName: payload.customerName || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
    }
    console.error('Error printing gift cards:', error);
    res.status(500).json({ error: 'Failed to print gift cards' });
  }
});

router.get('/preview/ticket', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'No completed orders found for preview' });
    }

    let qrBuffer: Buffer | null = null;
    try {
      const token = generateRouteToken(order.id);
      const driverRouteUrl = buildRouteViewUrl(token);
      qrBuffer = await generateOrderQRCodeBuffer(driverRouteUrl);
    } catch (error) {
      console.error('Failed to generate driver route QR for ticket preview:', error);
    }

    const pdfBuffer = await buildOrderTicketPdf(order, { qrCodeBuffer: qrBuffer });
    const stored = await storePdf(pdfBuffer, `preview-ticket-${Date.now()}`);
    res.json({ pdfUrl: stored.url });
  } catch (error) {
    console.error('Error generating ticket preview:', error);
    res.status(500).json({ error: 'Failed to generate ticket preview' });
  }
});

router.get('/preview/receipt', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true,
        orderPayments: {
          include: {
            transaction: {
              include: {
                paymentMethods: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'No completed orders found for preview' });
    }

    const orderWithTransactions = {
      ...order,
      transactions: getOrderTransactions(order),
    };

    const pdfBuffer = await buildReceiptPdf(orderWithTransactions);
    const stored = await storePdf(pdfBuffer, `preview-receipt-${Date.now()}`);
    res.json({ pdfUrl: stored.url });
  } catch (error) {
    console.error('Error generating receipt preview:', error);
    res.status(500).json({ error: 'Failed to generate receipt preview' });
  }
});

router.get('/preview/invoice', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'No completed orders found for preview' });
    }

    const pdfBuffer = await buildInvoicePdf(order);
    const stored = await storePdf(pdfBuffer, `preview-invoice-${Date.now()}`);
    res.json({ pdfUrl: stored.url });
  } catch (error) {
    console.error('Error generating invoice preview:', error);
    res.status(500).json({ error: 'Failed to generate invoice preview' });
  }
});

router.get('/preview/thermal', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true,
        orderPayments: {
          include: {
            transaction: {
              include: {
                paymentMethods: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'No completed orders found for preview' });
    }

    const orderWithTransactions = {
      ...order,
      transactions: getOrderTransactions(order),
    };

    const pdfBuffer = await buildReceiptPdf(orderWithTransactions);
    const stored = await storePdf(pdfBuffer, `preview-thermal-${Date.now()}`);
    res.json({ pdfUrl: stored.url });
  } catch (error) {
    console.error('Error generating thermal preview:', error);
    res.status(500).json({ error: 'Failed to generate thermal preview' });
  }
});

export default router;
