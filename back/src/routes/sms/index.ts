import { Router } from 'express';
import { smsService } from '../../services/smsService';

const router = Router();

// Test SMS endpoint
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    console.log('📱 Testing SMS to:', phoneNumber);
    const success = await smsService.sendTestSMS(phoneNumber);
    
    if (success) {
      res.json({
        success: true,
        message: 'Test SMS sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test SMS'
      });
    }
  } catch (error) {
    console.error('Error in test SMS endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send receipt SMS
router.post('/receipt', async (req, res) => {
  try {
    const {
      phoneNumber,
      customerName,
      transactionNumber,
      orderNumbers,
      totalAmount,
      paymentMethods
    } = req.body;

    if (!phoneNumber || !customerName || !transactionNumber || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumber, customerName, transactionNumber, totalAmount'
      });
    }

    console.log('🧾 Sending receipt SMS:', {
      phoneNumber,
      customerName,
      transactionNumber,
      totalAmount
    });

    const success = await smsService.sendReceiptSMS({
      phoneNumber,
      customerName,
      transactionNumber,
      orderNumbers: orderNumbers || [],
      totalAmount: parseFloat(totalAmount),
      paymentMethods: paymentMethods || []
    });

    if (success) {
      res.json({
        success: true,
        message: 'Receipt SMS sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send receipt SMS'
      });
    }
  } catch (error) {
    console.error('Error in receipt SMS endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send order confirmation SMS
router.post('/order-confirmation', async (req, res) => {
  try {
    const {
      phoneNumber,
      customerName,
      orderNumber,
      totalAmount,
      deliveryDate,
      deliveryTime
    } = req.body;

    if (!phoneNumber || !customerName || !orderNumber || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumber, customerName, orderNumber, totalAmount'
      });
    }

    console.log('📋 Sending order confirmation SMS:', {
      phoneNumber,
      customerName,
      orderNumber,
      totalAmount
    });

    const success = await smsService.sendOrderConfirmationSMS({
      phoneNumber,
      customerName,
      orderNumber,
      totalAmount: parseFloat(totalAmount),
      deliveryDate,
      deliveryTime
    });

    if (success) {
      res.json({
        success: true,
        message: 'Order confirmation SMS sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send order confirmation SMS'
      });
    }
  } catch (error) {
    console.error('Error in order confirmation SMS endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get SMS service status
router.get('/status', async (req, res) => {
  try {
    const status = smsService.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting SMS status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;