import { PrismaClient } from "@prisma/client";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize SendGrid
const prisma = new PrismaClient();

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface FtdNotificationPayload {
  externalId: string;
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  city?: string | null;
  deliveryDate?: Date | null;
  productDescription?: string | null;
  totalAmount?: number | null;
  cardMessage?: string | null;
  deliveryInstructions?: string | null;
  isUpdate?: boolean;
}

export async function sendFtdOrderNotification(payload: FtdNotificationPayload) {
  const settings = await prisma.ftdSettings.findFirst();

  if (!settings || !settings.notifyOnNewOrder) {
    return;
  }

  const recipientName = `${payload.recipientFirstName || ''} ${payload.recipientLastName || ''}`.trim();
  const deliveryDate = payload.deliveryDate
    ? new Date(payload.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'ASAP';

  const headline = payload.isUpdate ? '🔁 FTD Order Updated' : '🆕 New FTD Wire Order';
  const emailHeadline = payload.isUpdate ? '🔁 FTD Order Updated' : '🆕 New FTD Wire Order';

  const message = `
${headline}

Order: ${payload.externalId}
Recipient: ${recipientName || 'N/A'}
City: ${payload.city || 'N/A'}
Date: ${deliveryDate}
Product: ${payload.productDescription || 'See details'}
Amount: $${payload.totalAmount?.toFixed(2) || '0.00'}
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
            <p style="margin: 8px 0;"><strong>Order #:</strong> ${payload.externalId}</p>
            <p style="margin: 8px 0;"><strong>Recipient:</strong> ${recipientName || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>City:</strong> ${payload.city || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Delivery Date:</strong> ${deliveryDate}</p>
            <p style="margin: 8px 0;"><strong>Product:</strong> ${payload.productDescription || 'See dashboard for details'}</p>
            <p style="margin: 8px 0;"><strong>Amount:</strong> $${payload.totalAmount?.toFixed(2) || '0.00'}</p>
            ${payload.cardMessage ? `<p style="margin: 8px 0;"><strong>Card Message:</strong> ${payload.cardMessage}</p>` : ''}
            ${payload.deliveryInstructions ? `<p style="margin: 8px 0;"><strong>Instructions:</strong> ${payload.deliveryInstructions}</p>` : ''}
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            View in your Bloom dashboard: FTD Orders → ${payload.externalId}
          </p>
        </div>
      `;

      await sgMail.send({
        to: settings.notifyEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `${payload.isUpdate ? "Updated" : "New"} FTD Order: ${payload.externalId}`,
        html: htmlMessage,
      });
      console.log(`📧 FTD notification sent via email to ${settings.notifyEmail}`);
    } catch (err: any) {
      console.error("Failed to send FTD email:", err.message);
    }
  }
}
