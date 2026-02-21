import { Router, Request, Response } from 'express';
import { PrismaClient, CommunicationType } from '@prisma/client';
import smsService from '../services/smsService';
import { sendPushoverNotification } from '../services/pushoverService';

const router = Router();
const metaRouter = Router();
const prisma = new PrismaClient();

// GET /api/orders/:orderId/communications - Get all communications for an order
router.get('/:orderId/communications', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const communications = await prisma.orderCommunication.findMany({
      where: { orderId },
      include: {
        employee: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Newest first
      }
    });

    res.json({
      success: true,
      communications
    });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communications'
    });
  }
});

// POST /api/orders/:orderId/communications - Add a communication entry (phone call, note)
router.post('/:orderId/communications', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const {
      type,
      status,
      quickActions,
      message,
      recipient,
      subject,
      employeeId
    } = req.body;

    // Validate required fields
    if (!type || !message) {
      return res.status(400).json({
        success: false,
        error: 'Type and message are required'
      });
    }

    // Create communication record
    const communication = await prisma.orderCommunication.create({
      data: {
        orderId,
        employeeId,
        type: type as CommunicationType,
        status,
        quickActions: quickActions || [],
        message,
        recipient,
        subject,
        isAutomatic: false,
        sentVia: 'Manual',
        readAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      communication
    });
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create communication'
    });
  }
});

// POST /api/orders/:orderId/sms - Send SMS and log it
router.post('/:orderId/sms', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { phoneNumber, message, employeeId } = req.body;

    // Validate required fields
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Send SMS via Twilio
    const smsSent = await smsService.sendSMS({
      to: phoneNumber,
      message
    });

    if (!smsSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send SMS'
      });
    }

    // Log the communication
    const communication = await prisma.orderCommunication.create({
      data: {
        orderId,
        employeeId,
        type: CommunicationType.SMS_SENT,
        message,
        recipient: phoneNumber,
        isAutomatic: false,
        sentVia: 'Twilio',
        readAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true
          }
        },
        order: {
          select: { orderNumber: true }
        }
      }
    });

    const adminBaseUrl = process.env.ADMIN_BASE_URL || '';
    sendPushoverNotification({
      title: `SMS Sent → Order #${communication.order?.orderNumber ?? orderId}`,
      message: `To: ${phoneNumber}\n${message}`,
      group: 'sms-sent',
      ...(adminBaseUrl ? { link: `${adminBaseUrl}/orders/${orderId}` } : {})
    });

    res.json({
      success: true,
      communication
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS'
    });
  }
});

// PATCH /api/orders/:orderId/delivery-time - Update delivery time
router.patch('/:orderId/delivery-time', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { deliveryTime } = req.body;

    if (!deliveryTime) {
      return res.status(400).json({
        success: false,
        error: 'Delivery time is required'
      });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { deliveryTime }
    });

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error updating delivery time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery time'
    });
  }
});

// PATCH /api/orders/:orderId/communications/mark-read - Mark SMS communications as read
router.patch('/:orderId/communications/mark-read', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const updated = await prisma.orderCommunication.updateMany({
      where: {
        orderId,
        type: CommunicationType.SMS_RECEIVED,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    const [orderUnreadCount, totalUnreadCount] = await Promise.all([
      prisma.orderCommunication.count({
        where: {
          orderId,
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

    res.json({
      success: true,
      updated: updated.count,
      orderUnreadCount,
      totalUnreadCount
    });
  } catch (error) {
    console.error('Error marking communications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark communications as read'
    });
  }
});

// POST /api/orders/:orderId/additional-phones - Add a phone number to order
router.post('/:orderId/additional-phones', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Normalize phone - keep only digits
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { additionalPhones: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if already exists
    if (order.additionalPhones.includes(normalizedPhone)) {
      return res.json({
        success: true,
        additionalPhones: order.additionalPhones
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        additionalPhones: {
          push: normalizedPhone
        }
      },
      select: { additionalPhones: true }
    });

    res.json({
      success: true,
      additionalPhones: updated.additionalPhones
    });
  } catch (error) {
    console.error('Error adding additional phone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add phone number'
    });
  }
});

// DELETE /api/orders/:orderId/additional-phones/:phone - Remove a phone number from order
router.delete('/:orderId/additional-phones/:phone', async (req: Request, res: Response) => {
  try {
    const { orderId, phone } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { additionalPhones: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        additionalPhones: order.additionalPhones.filter(p => p !== phone)
      },
      select: { additionalPhones: true }
    });

    res.json({
      success: true,
      additionalPhones: updated.additionalPhones
    });
  } catch (error) {
    console.error('Error removing additional phone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove phone number'
    });
  }
});

// GET /api/orders/:orderId/related-orders - Get orders with same phone numbers
router.get('/:orderId/related-orders', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { phone: true } },
        deliveryAddress: { select: { phone: true } }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Collect all phone numbers for this order
    const phones: string[] = [];
    if (order.customer?.phone) phones.push(order.customer.phone);
    if (order.deliveryAddress?.phone) phones.push(order.deliveryAddress.phone);
    phones.push(...order.additionalPhones);

    if (phones.length === 0) {
      return res.json({
        success: true,
        relatedOrders: []
      });
    }

    // Find other orders with matching phones
    const relatedOrders = await prisma.order.findMany({
      where: {
        id: { not: orderId },
        OR: [
          { customer: { phone: { in: phones } } },
          { deliveryAddress: { phone: { in: phones } } },
          { additionalPhones: { hasSome: phones } }
        ]
      },
      select: {
        id: true,
        orderNumber: true,
        deliveryDate: true,
        status: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      relatedOrders,
      additionalPhones: order.additionalPhones
    });
  } catch (error) {
    console.error('Error fetching related orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch related orders'
    });
  }
});

// GET /api/communications/unread-count - Get total unread SMS count
metaRouter.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await prisma.orderCommunication.count({
      where: {
        type: CommunicationType.SMS_RECEIVED,
        readAt: null
      }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread communications count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread communications count'
    });
  }
});

// GET /api/communications/unread - Get recent unread SMS messages with order info
metaRouter.get('/unread', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit?.toString() || '10');

    const messages = await prisma.orderCommunication.findMany({
      where: {
        type: CommunicationType.SMS_RECEIVED,
        readAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            recipientCustomer: {
              select: { firstName: true, lastName: true }
            },
            customer: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread messages'
    });
  }
});

export { metaRouter as communicationsMetaRouter };
export default router;
