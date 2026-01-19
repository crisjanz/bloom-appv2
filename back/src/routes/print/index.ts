import { Router } from 'express';
import path from 'path';
import { PrismaClient, PrintJobType } from '@prisma/client';
import { printService } from '../../services/printService';
import { printSettingsService } from '../../services/printSettingsService';
import { buildReceiptPdf } from '../../templates/receipt-pdf';
import { buildInvoicePdf } from '../../templates/invoice-pdf';
import { buildOrderTicketPdf } from '../../templates/order-ticket-pdf';
import { buildThermalReceipt } from '../../templates/receipt-thermal';
import { loadLocalPdf, storePdf } from '../../utils/pdfStorage';

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
      const pdfBuffer = await buildOrderTicketPdf(order);
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
