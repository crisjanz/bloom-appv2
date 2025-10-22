import { PrismaClient } from "@prisma/client";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

const prisma = new PrismaClient();

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendFtdOrderNotification(ftdOrder: any) {
  const settings = await prisma.ftdSettings.findFirst();

  if (!settings || !settings.notifyOnNewOrder) {
    return;
  }

  const recipientName = `${ftdOrder.recipientFirstName || ''} ${ftdOrder.recipientLastName || ''}`.trim();
  const deliveryDate = ftdOrder.deliveryDate
    ? new Date(ftdOrder.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'ASAP';

  const message = `
🆕 New FTD Wire Order

Order: ${ftdOrder.externalId}
Recipient: ${recipientName || 'N/A'}
City: ${ftdOrder.city || 'N/A'}
Date: ${deliveryDate}
Product: ${ftdOrder.productDescription || 'See details'}
Amount: $${ftdOrder.totalAmount?.toFixed(2) || '0.00'}
  `.trim();

  // Send SMS notification
  if (settings.notifyPhoneNumber && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        to: settings.notifyPhoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message,
      });
      console.log(`📱 FTD notification sent via SMS to ${settings.notifyPhoneNumber}`);
    } catch (err: any) {
      console.error("Failed to send FTD SMS:", err.message);
    }
  }

  // Send Email notification
  if (settings.notifyEmail && process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    try {
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #597485;">🆕 New FTD Wire Order</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Order #:</strong> ${ftdOrder.externalId}</p>
            <p style="margin: 8px 0;"><strong>Recipient:</strong> ${recipientName || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>City:</strong> ${ftdOrder.city || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Delivery Date:</strong> ${deliveryDate}</p>
            <p style="margin: 8px 0;"><strong>Product:</strong> ${ftdOrder.productDescription || 'See dashboard for details'}</p>
            <p style="margin: 8px 0;"><strong>Amount:</strong> $${ftdOrder.totalAmount?.toFixed(2) || '0.00'}</p>
            ${ftdOrder.cardMessage ? `<p style="margin: 8px 0;"><strong>Card Message:</strong> ${ftdOrder.cardMessage}</p>` : ''}
            ${ftdOrder.deliveryInstructions ? `<p style="margin: 8px 0;"><strong>Instructions:</strong> ${ftdOrder.deliveryInstructions}</p>` : ''}
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            View in your Bloom dashboard: FTD Orders → ${ftdOrder.externalId}
          </p>
        </div>
      `;

      await sgMail.send({
        to: settings.notifyEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `New FTD Order: ${ftdOrder.externalId}`,
        html: htmlMessage,
      });
      console.log(`📧 FTD notification sent via email to ${settings.notifyEmail}`);
    } catch (err: any) {
      console.error("Failed to send FTD email:", err.message);
    }
  }

  // Mark notification as sent
  await prisma.ftdOrder.update({
    where: { id: ftdOrder.id },
    data: {
      notificationSent: true,
      notificationSentAt: new Date(),
    },
  }).catch(err => {
    console.error("Failed to mark notification as sent:", err.message);
  });
}
