import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../../services/emailService';
import { buildInvoicePdf } from '../../templates/invoice-pdf';
import { buildReceiptEmail } from '../../templates/email/receipt-email';
import { buildInvoiceEmail } from '../../templates/email/invoice-email';
import { formatOrderNumber } from '../../utils/formatOrderNumber';
import { getOrderNumberPrefix } from '../../utils/orderNumberSettings';

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

router.post('/receipt/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await loadOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const requestedEmail = typeof req.body?.toEmail === 'string' ? req.body.toEmail.trim() : '';
    const toEmail = requestedEmail || order.customer?.email;
    if (!toEmail) {
      return res.status(400).json({ error: 'Customer email is missing for this order' });
    }

    const orderNumberPrefix = await getOrderNumberPrefix(prisma);
    const formattedOrderNumber = formatOrderNumber(order.orderNumber ?? order.id, orderNumberPrefix);
    const html = buildReceiptEmail(order, orderNumberPrefix);

    const success = await emailService.sendEmail({
      to: toEmail,
      subject: `Your receipt from Bloom Flowers (${formattedOrderNumber})`,
      html,
    });

    if (!success) {
      return res.status(500).json({ error: 'Failed to send receipt email' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    res.status(500).json({ error: 'Failed to send receipt email' });
  }
});

router.post('/invoice/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await loadOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const requestedEmail = typeof req.body?.toEmail === 'string' ? req.body.toEmail.trim() : '';
    const toEmail = requestedEmail || order.customer?.email;
    if (!toEmail) {
      return res.status(400).json({ error: 'Customer email is missing for this order' });
    }

    const orderNumberPrefix = await getOrderNumberPrefix(prisma);
    const formattedOrderNumber = formatOrderNumber(order.orderNumber ?? order.id, orderNumberPrefix);
    const pdfBuffer = await buildInvoicePdf(order, orderNumberPrefix);
    const html = buildInvoiceEmail(order, orderNumberPrefix);
    const filename = `invoice-${formattedOrderNumber}.pdf`;

    const success = await emailService.sendEmail({
      to: toEmail,
      subject: `Your invoice from Bloom Flowers (${formattedOrderNumber})`,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!success) {
      return res.status(500).json({ error: 'Failed to send invoice email' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ error: 'Failed to send invoice email' });
  }
});

export default router;
