import express, { Router } from 'express';
import { z } from 'zod';
import twilio from 'twilio';
import { PrismaClient, CommunicationType } from '@prisma/client';
import { emailSettingsService } from '../../services/emailSettingsService';
import { smsService } from '../../services/smsService';
import { broadcastSmsReceived, broadcastSmsStatusUpdated } from '../../services/communicationsSocketService';
import { sendPushoverNotification } from '../../services/pushoverService';

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Strategy 1: Find orders where we recently sent an SMS to this phone (most reliable)
    const recentOutboundMatch = await prisma.orderCommunication.findFirst({
      where: {
        type: CommunicationType.SMS_SENT,
        recipient: { in: phoneCandidates },
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      select: { orderId: true, order: { select: { id: true, orderNumber: true } } }
    });

    // Strategy 2: Match by phone on order/customer/address (within 30 days)
    const matchingOrders = await prisma.order.findMany({
      where: {
        OR: [
          { createdAt: { gte: thirtyDaysAgo } },
          { deliveryDate: { gte: thirtyDaysAgo } }
        ],
        AND: {
          OR: [
            { deliveryAddress: { phone: { in: phoneCandidates } } },
            { customer: { phone: { in: phoneCandidates } } },
            { recipientCustomer: { phone: { in: phoneCandidates } } },
            { additionalPhones: { hasSome: phoneCandidates } }
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true }
    });

    // Prefer outbound SMS match, then fall back to phone match
    if (recentOutboundMatch?.order) {
      const alreadyInList = matchingOrders.some(o => o.id === recentOutboundMatch.order.id);
      if (!alreadyInList) {
        matchingOrders.unshift(recentOutboundMatch.order);
      } else {
        // Move it to front
        const idx = matchingOrders.findIndex(o => o.id === recentOutboundMatch.order.id);
        if (idx > 0) {
          const [item] = matchingOrders.splice(idx, 1);
          matchingOrders.unshift(item);
        }
      }
    }

    if (matchingOrders.length === 0) {
      console.warn('No matching order found for incoming SMS', normalizedPhone, 'candidates:', phoneCandidates, 'outbound match:', recentOutboundMatch?.order?.orderNumber ?? 'none');
      sendPushoverNotification({
        title: `SMS from ${normalizedPhone}`,
        message: Body,
        priority: 0
      });
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

    const adminBaseUrl = process.env.ADMIN_BASE_URL || '';
    sendPushoverNotification({
      title: `SMS re: Order #${order.orderNumber}`,
      message: `${normalizedPhone}: ${Body}`,
      priority: 0,
      ...(adminBaseUrl ? {
        url: `${adminBaseUrl}/orders/${order.id}`,
        urlTitle: `Open Order #${order.orderNumber}`
      } : {})
    });

    return res.type('text/xml').send('<Response/>');
  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    return res.status(500).send('Webhook failed');
  }
});

// Twilio delivery status callback
const StatusCallbackSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string() // queued, sending, sent, delivered, undelivered, failed
});

router.post('/status-callback', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const parsed = StatusCallbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.sendStatus(400);
    }

    const { MessageSid, MessageStatus } = parsed.data;

    // Map Twilio status to our display status
    const statusMap: Record<string, string> = {
      queued: 'sending',
      sending: 'sending',
      sent: 'sending',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed'
    };
    const status = statusMap[MessageStatus] ?? MessageStatus;

    const communication = await prisma.orderCommunication.findFirst({
      where: { twilioSid: MessageSid },
      select: { id: true, orderId: true, recipient: true, order: { select: { orderNumber: true } } }
    });

    if (!communication) {
      return res.sendStatus(200);
    }

    await prisma.orderCommunication.update({
      where: { id: communication.id },
      data: { status }
    });

    broadcastSmsStatusUpdated({
      communicationId: communication.id,
      orderId: communication.orderId,
      status
    });

    if (status === 'failed') {
      const adminBaseUrl = process.env.ADMIN_BASE_URL || '';
      sendPushoverNotification({
        title: `SMS Failed → Order #${communication.order?.orderNumber ?? communication.orderId}`,
        message: `To: ${communication.recipient ?? 'unknown'} — ${MessageStatus}`,
        priority: 1,
        ...(adminBaseUrl ? { link: `${adminBaseUrl}/orders/${communication.orderId}` } : {})
      });
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('Error handling SMS status callback:', error);
    return res.sendStatus(500);
  }
});

export default router;
