import { Router, Request, Response } from 'express';
import { PrismaClient, CommunicationType } from '@prisma/client';
import smsService from '../services/smsService';

const router = Router();
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
        sentVia: 'Manual'
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
        sentVia: 'Twilio'
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

export default router;
