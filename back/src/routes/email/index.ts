import { Router } from 'express';
import { emailService } from '../../services/emailService';

const router = Router();

// Test email endpoint
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    console.log('📧 Testing email to:', email);
    const success = await emailService.sendTestEmail(email);
    
    if (success) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test email'
      });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send gift card email
router.post('/gift-card', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      giftCardNumber,
      amount,
      purchaserName,
      message
    } = req.body;

    if (!recipientEmail || !recipientName || !giftCardNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientEmail, recipientName, giftCardNumber, amount'
      });
    }

    console.log('🎁 Sending gift card email:', {
      recipientEmail,
      recipientName,
      giftCardNumber,
      amount
    });

    const success = await emailService.sendGiftCardEmail({
      recipientEmail,
      recipientName,
      giftCardNumber,
      amount: parseFloat(amount),
      purchaserName,
      message,
      redeemUrl: 'https://bloomflowershop.com' // Update when website is live
    });

    if (success) {
      res.json({
        success: true,
        message: 'Gift card email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send gift card email'
      });
    }
  } catch (error) {
    console.error('Error in gift card email endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send receipt email
router.post('/receipt', async (req, res) => {
  try {
    const {
      customerEmail,
      customerName,
      transactionNumber,
      orderNumbers,
      totalAmount,
      paymentMethods,
      orderDetails
    } = req.body;

    if (!customerEmail || !customerName || !transactionNumber || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerEmail, customerName, transactionNumber, totalAmount'
      });
    }

    console.log('🧾 Sending receipt email:', {
      customerEmail,
      customerName,
      transactionNumber,
      totalAmount
    });

    const success = await emailService.sendReceiptEmail({
      customerEmail,
      customerName,
      transactionNumber,
      orderNumbers: orderNumbers || [],
      totalAmount: parseFloat(totalAmount),
      paymentMethods: paymentMethods || [],
      orderDetails: orderDetails || []
    });

    if (success) {
      res.json({
        success: true,
        message: 'Receipt email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send receipt email'
      });
    }
  } catch (error) {
    console.error('Error in receipt email endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;