import { Router } from 'express';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';

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

// Send receipt email and/or SMS
router.post('/receipt', async (req, res) => {
  try {
    const {
      customerEmail,
      customerName,
      customerPhone,
      transactionNumber,
      orderNumbers,
      totalAmount,
      paymentMethods,
      orderDetails,
      sendEmail = true,
      sendSMS = false
    } = req.body;

    if (!customerName || !transactionNumber || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerName, transactionNumber, totalAmount'
      });
    }

    // Validate email if sending email
    if (sendEmail && !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'customerEmail is required when sendEmail is true'
      });
    }

    // Validate phone if sending SMS
    if (sendSMS && !customerPhone) {
      return res.status(400).json({
        success: false,
        error: 'customerPhone is required when sendSMS is true'
      });
    }

    console.log('🧾 Sending receipt notifications:', {
      customerEmail,
      customerPhone,
      customerName,
      transactionNumber,
      totalAmount,
      sendEmail,
      sendSMS
    });

    const results = {
      email: { sent: false, success: false },
      sms: { sent: false, success: false }
    };

    // Send email receipt if requested
    if (sendEmail && customerEmail) {
      results.email.sent = true;
      results.email.success = await emailService.sendReceiptEmail({
        customerEmail,
        customerName,
        transactionNumber,
        orderNumbers: orderNumbers || [],
        totalAmount: parseFloat(totalAmount),
        paymentMethods: paymentMethods || [],
        orderDetails: orderDetails || []
      });
    }

    // Send SMS receipt if requested
    if (sendSMS && customerPhone) {
      results.sms.sent = true;
      results.sms.success = await smsService.sendReceiptSMS({
        phoneNumber: customerPhone,
        customerName,
        transactionNumber,
        orderNumbers: orderNumbers || [],
        totalAmount: parseFloat(totalAmount),
        paymentMethods: paymentMethods || []
      });
    }

    // Determine overall success
    const emailOk = !results.email.sent || results.email.success;
    const smsOk = !results.sms.sent || results.sms.success;
    const overallSuccess = emailOk && smsOk;

    // Build response message
    let message = '';
    if (results.email.sent && results.sms.sent) {
      if (overallSuccess) {
        message = 'Receipt email and SMS sent successfully';
      } else {
        message = 'Some receipt notifications failed to send';
      }
    } else if (results.email.sent) {
      message = results.email.success ? 'Receipt email sent successfully' : 'Failed to send receipt email';
    } else if (results.sms.sent) {
      message = results.sms.success ? 'Receipt SMS sent successfully' : 'Failed to send receipt SMS';
    } else {
      message = 'No receipt notifications were requested';
    }

    if (overallSuccess) {
      res.json({
        success: true,
        message,
        results
      });
    } else {
      res.status(500).json({
        success: false,
        error: message,
        results
      });
    }
  } catch (error) {
    console.error('Error in receipt notification endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;