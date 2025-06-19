// Unified Notification API Routes
// Replaces separate /api/email/* and /api/sms/* endpoints

import express from 'express';
import { NotificationService, NotificationChannel, NotificationType } from '../../services/notificationService';

const router = express.Router();
const notificationService = new NotificationService();

/**
 * POST /api/notifications/send
 * Universal notification endpoint
 */
router.post('/send', async (req, res) => {
  try {
    const { 
      type, 
      channels, 
      data, 
      fallback = true 
    }: {
      type: NotificationType;
      channels: NotificationChannel[];
      data: any;
      fallback?: boolean;
    } = req.body;

    // Validation
    if (!type || !channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, channels' 
      });
    }

    if (!data) {
      return res.status(400).json({ 
        error: 'Missing notification data' 
      });
    }

    // Send notification
    const results = await notificationService.sendNotification({
      type,
      channels,
      data,
      fallback
    });

    // Check if any succeeded
    const hasSuccess = results.some(r => r.success);
    const statusCode = hasSuccess ? 200 : 500;

    res.status(statusCode).json({
      success: hasSuccess,
      results,
      message: hasSuccess 
        ? 'Notification sent successfully'
        : 'All notification channels failed'
    });

  } catch (error) {
    console.error('Notification send error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send notification' 
    });
  }
});

/**
 * POST /api/notifications/receipt
 * Receipt-specific endpoint (backward compatibility + enhanced functionality)
 */
router.post('/receipt', async (req, res) => {
  try {
    const { 
      channels,
      customerEmail,
      customerPhone,
      customerName,
      transactionNumber,
      transactionId,
      total,
      sendEmail = true, // Legacy support
      sendSMS = false,   // Legacy support
      fallback = true
    } = req.body;

    // Determine channels - prioritize explicit channels over legacy flags
    let notificationChannels: NotificationChannel[];
    if (channels && Array.isArray(channels)) {
      notificationChannels = channels;
    } else {
      // Legacy mode - use sendEmail/sendSMS flags
      notificationChannels = [];
      if (sendEmail) notificationChannels.push('email');
      if (sendSMS) notificationChannels.push('sms');
      // If no legacy flags set, default to email for backward compatibility
      if (notificationChannels.length === 0) {
        notificationChannels = ['email'];
      }
    }

    // Validation
    if (notificationChannels.includes('email') && !customerEmail) {
      return res.status(400).json({ 
        error: 'Email address required for email receipts' 
      });
    }

    if (notificationChannels.includes('sms') && !customerPhone) {
      return res.status(400).json({ 
        error: 'Phone number required for SMS receipts' 
      });
    }

    if (!transactionNumber && !transactionId) {
      return res.status(400).json({ 
        error: 'Transaction number or ID required' 
      });
    }

    // Send receipt
    const results = await notificationService.sendReceipt(
      notificationChannels,
      {
        firstName: customerName?.split(' ')[0] || '',
        lastName: customerName?.split(' ').slice(1).join(' ') || '',
        email: customerEmail,
        phone: customerPhone,
        transactionNumber: transactionNumber || transactionId,
        transactionId,
        orderTotal: total
      },
      fallback
    );

    const hasSuccess = results.some(r => r.success);

    res.status(hasSuccess ? 200 : 500).json({
      success: hasSuccess,
      results,
      message: hasSuccess 
        ? 'Receipt sent successfully'
        : 'Failed to send receipt'
    });

  } catch (error) {
    console.error('Receipt notification error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send receipt' 
    });
  }
});

/**
 * POST /api/notifications/order-confirmation
 * Order confirmation notification
 */
router.post('/order-confirmation', async (req, res) => {
  try {
    const {
      channels = ['sms'],
      customerEmail,
      customerPhone,
      customerName,
      orderNumber,
      orderId,
      total,
      deliveryDate,
      deliveryTime
    } = req.body;

    // Validation
    if (channels.includes('email') && !customerEmail) {
      return res.status(400).json({ 
        error: 'Email address required for email notifications' 
      });
    }

    if (channels.includes('sms') && !customerPhone) {
      return res.status(400).json({ 
        error: 'Phone number required for SMS notifications' 
      });
    }

    if (!orderNumber && !orderId) {
      return res.status(400).json({ 
        error: 'Order number or ID required' 
      });
    }

    // Send order confirmation
    const results = await notificationService.sendOrderConfirmation(
      channels,
      {
        firstName: customerName?.split(' ')[0] || '',
        email: customerEmail,
        phone: customerPhone,
        orderNumber: orderNumber || orderId,
        orderId,
        orderTotal: total,
        deliveryDate,
        deliveryTime
      }
    );

    const hasSuccess = results.some(r => r.success);

    res.status(hasSuccess ? 200 : 500).json({
      success: hasSuccess,
      results,
      message: hasSuccess 
        ? 'Order confirmation sent successfully'
        : 'Failed to send order confirmation'
    });

  } catch (error) {
    console.error('Order confirmation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send order confirmation' 
    });
  }
});

/**
 * POST /api/notifications/status-update
 * Order status change notification
 */
router.post('/status-update', async (req, res) => {
  try {
    const {
      channels = ['sms'],
      customerEmail,
      customerPhone,
      customerName,
      orderNumber,
      orderId,
      newStatus,
      deliveryDate,
      deliveryTime
    } = req.body;

    // Validation
    if (!newStatus) {
      return res.status(400).json({ 
        error: 'New status required' 
      });
    }

    if (channels.includes('email') && !customerEmail) {
      return res.status(400).json({ 
        error: 'Email address required for email notifications' 
      });
    }

    if (channels.includes('sms') && !customerPhone) {
      return res.status(400).json({ 
        error: 'Phone number required for SMS notifications' 
      });
    }

    // Send status update
    const results = await notificationService.sendStatusUpdate(
      channels,
      {
        firstName: customerName?.split(' ')[0] || '',
        email: customerEmail,
        phone: customerPhone,
        orderNumber: orderNumber || orderId,
        orderId,
        newStatus,
        deliveryDate,
        deliveryTime
      }
    );

    const hasSuccess = results.some(r => r.success);

    res.status(hasSuccess ? 200 : 500).json({
      success: hasSuccess,
      results,
      message: hasSuccess 
        ? 'Status update sent successfully'
        : 'Failed to send status update'
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send status update' 
    });
  }
});

/**
 * GET /api/notifications/templates
 * Get available notification templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = notificationService.getTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get templates' 
    });
  }
});

/**
 * POST /api/notifications/test
 * Test notification functionality
 */
router.post('/test', async (req, res) => {
  try {
    const { 
      channel = 'sms',
      email,
      phone 
    } = req.body;

    if (channel === 'email' && !email) {
      return res.status(400).json({ 
        error: 'Email address required for email test' 
      });
    }

    if (channel === 'sms' && !phone) {
      return res.status(400).json({ 
        error: 'Phone number required for SMS test' 
      });
    }

    const results = await notificationService.sendNotification({
      type: 'receipt',
      channels: [channel],
      data: {
        firstName: 'Test',
        email,
        phone,
        transactionNumber: 'TEST-001',
        orderTotal: 25.00
      }
    });

    const hasSuccess = results.some(r => r.success);

    res.status(hasSuccess ? 200 : 500).json({
      success: hasSuccess,
      results,
      message: hasSuccess 
        ? 'Test notification sent successfully'
        : 'Test notification failed'
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send test notification' 
    });
  }
});

export default router;