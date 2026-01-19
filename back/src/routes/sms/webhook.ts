import express, { Router } from 'express';
import { z } from 'zod';
import twilio from 'twilio';
import { PrismaClient, CommunicationType } from '@prisma/client';
import { emailSettingsService } from '../../services/emailSettingsService';
import { smsService } from '../../services/smsService';
import { broadcastSmsReceived } from '../../services/communicationsSocketService';

const router = Router();
const prisma = new PrismaClient();

const WebhookSchema = z.object({
  From: z.string().min(1),
  Body: z.string().min(1),
  To: z.string().optional()
});

const buildRequestUrl = (req: express.Request) => {
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
  return `${protocol}://${host}${req.originalUrl}`;
};

const buildPhoneCandidates = (normalizedPhone: string) => {
  const digits = normalizedPhone.replace(/\D/g, '');
  const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return Array.from(new Set([normalizedPhone, localDigits, digits].filter(Boolean)));
};

router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const parsed = WebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn('Invalid SMS webhook payload');
      return res.status(400).send('Invalid payload');
    }

    const { From, Body } = parsed.data;
    const settings = await emailSettingsService.getSettingsWithSecrets();

    if (!settings.twilioAuthToken || !settings.smsEnabled) {
      console.warn('SMS webhook received but SMS is not configured');
      return res.type('text/xml').send('<Response/>');
    }

    const signatureHeader = req.headers['x-twilio-signature'];
    const requestUrl = buildRequestUrl(req);
    const isValid = twilio.validateRequest(
      settings.twilioAuthToken,
      typeof signatureHeader === 'string' ? signatureHeader : '',
      requestUrl,
      req.body
    );

    if (!isValid) {
      console.warn('Rejected SMS webhook: invalid Twilio signature');
      return res.status(403).send('Invalid signature');
    }

    const normalizedPhone = smsService.normalizePhoneNumber(From);
    if (!normalizedPhone) {
      console.warn('Rejected SMS webhook: invalid phone number', From);
      return res.type('text/xml').send('<Response/>');
    }

    const phoneCandidates = buildPhoneCandidates(normalizedPhone);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find ALL matching orders (for logging), then pick most recent
    const matchingOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        OR: [
          { deliveryAddress: { phone: { in: phoneCandidates } } },
          { customer: { phone: { in: phoneCandidates } } },
          { additionalPhones: { hasSome: phoneCandidates } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true }
    });

    if (matchingOrders.length === 0) {
      console.warn('No matching order found for incoming SMS', normalizedPhone);
      return res.type('text/xml').send('<Response/>');
    }

    if (matchingOrders.length > 1) {
      console.log(`📱 Incoming SMS matches ${matchingOrders.length} orders:`,
        matchingOrders.map(o => `#${o.orderNumber}`).join(', '),
        `- assigning to most recent #${matchingOrders[0].orderNumber}`
      );
    }

    const order = matchingOrders[0];

    const communication = await prisma.orderCommunication.create({
      data: {
        orderId: order.id,
        type: CommunicationType.SMS_RECEIVED,
        message: Body,
        recipient: normalizedPhone,
        isAutomatic: true,
        sentVia: 'Twilio',
        readAt: null
      }
    });

    const [orderUnreadCount, totalUnreadCount] = await Promise.all([
      prisma.orderCommunication.count({
        where: {
          orderId: order.id,
          type: CommunicationType.SMS_RECEIVED,
          readAt: null
        }
      }),
      prisma.orderCommunication.count({
        where: {
          type: CommunicationType.SMS_RECEIVED,
          readAt: null
        }
      })
    ]);

    broadcastSmsReceived({
      orderId: order.id,
      message: Body,
      createdAt: communication.createdAt.toISOString(),
      communicationId: communication.id,
      orderUnreadCount,
      totalUnreadCount
    });

    return res.type('text/xml').send('<Response/>');
  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    return res.status(500).send('Webhook failed');
  }
});

export default router;
