import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../../services/emailService';
import { buildReceiptPdf } from '../../templates/receipt-pdf';
import { buildInvoicePdf } from '../../templates/invoice-pdf';
import { buildReceiptEmail } from '../../templates/email/receipt-email';
import { buildInvoiceEmail } from '../../templates/email/invoice-email';

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

    const pdfBuffer = await buildReceiptPdf(order);
    const html = buildReceiptEmail(order);
    const filename = `receipt-${order.orderNumber ?? order.id}.pdf`;

    const success = await emailService.sendEmail({
      to: toEmail,
      subject: `Your receipt from Bloom Flowers (${order.orderNumber ?? order.id})`,
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

    const pdfBuffer = await buildInvoicePdf(order);
    const html = buildInvoiceEmail(order);
    const filename = `invoice-${order.orderNumber ?? order.id}.pdf`;

    const success = await emailService.sendEmail({
      to: toEmail,
      subject: `Your invoice from Bloom Flowers (${order.orderNumber ?? order.id})`,
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
