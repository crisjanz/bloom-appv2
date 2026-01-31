import fs from 'fs';
import path from 'path';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { emailSettingsService } from './emailSettingsService';
import { buildGiftCardReceiptEmail, type GiftCardReceiptTemplateData } from '../templates/email/gift-card-receipt-email';

const prisma = new PrismaClient();

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: any;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface GiftCardEmailData {
  recipientName: string;
  recipientEmail: string;
  giftCardNumber: string;
  amount: number;
  purchaserName?: string;
  message?: string;
  redeemUrl?: string;
}

interface StoreEmailInfo {
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  logoUrl?: string;
}

type GiftCardReceiptEmailData = {
  purchaserEmail: string;
  purchaserName: string;
  cards: GiftCardReceiptTemplateData['cards'];
  totalAmount: number;
};

interface ReceiptEmailData {
  customerName: string;
  customerEmail: string;
  transactionNumber: string;
  orderNumbers: string[];
  totalAmount: number;
  paymentMethods: Array<{
    type: string;
    amount: number;
  }>;
  orderDetails: any[];
}

class EmailService {
  private giftCardTemplateCache: string | null | undefined;
  private warnedMissingGiftCardTemplate = false;

  /**
   * Send a basic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const settings = await emailSettingsService.getSettingsWithSecrets();

      if (!settings.enabled || settings.provider === 'disabled') {
        console.warn('Email sending is disabled by settings.');
        return false;
      }

      const from = {
        email: settings.fromEmail,
        name: settings.fromName,
      };

      if (settings.provider === 'sendgrid') {
        if (!settings.apiKey) {
          console.error('SendGrid API key is not configured.');
          return false;
        }

        sgMail.setApiKey(settings.apiKey);
        const msg: any = {
          to: options.to,
          from,
          subject: options.subject
        };

        // Add content based on whether we're using templates or custom HTML
        if (options.templateId) {
          msg.templateId = options.templateId;
          msg.dynamicTemplateData = options.dynamicTemplateData || {};
        } else {
          if (options.html) {
            msg.html = options.html;
          }
          if (options.text) {
            msg.text = options.text;
          }
        }

        if (options.attachments?.length) {
          msg.attachments = options.attachments.map((attachment) => ({
            content: attachment.content.toString('base64'),
            filename: attachment.filename,
            type: attachment.contentType || 'application/octet-stream',
            disposition: 'attachment'
          }));
        }

        console.log('Sending email via SendGrid:', {
          to: options.to,
          subject: options.subject,
          templateId: options.templateId || 'custom'
        });

        await sgMail.send(msg);
      } else if (settings.provider === 'smtp') {
        if (!settings.smtpHost || !settings.smtpPort) {
          console.error('SMTP settings are incomplete.');
          return false;
        }

        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpPort === 465,
          auth: settings.smtpUser
            ? {
                user: settings.smtpUser,
                pass: settings.smtpPassword || ''
              }
            : undefined
        });

        await transporter.sendMail({
          to: options.to,
          from: `${from.name} <${from.email}>`,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType || 'application/octet-stream'
          }))
        });
      } else {
        console.warn(`Unsupported email provider: ${settings.provider}`);
        return false;
      }

      console.log('Email sent successfully:', {
        to: options.to,
        subject: options.subject
      });
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send digital gift card email
   */
  async sendGiftCardEmail(data: GiftCardEmailData): Promise<boolean> {
    try {
      const storeInfo = await this.getStoreInfo();
      // For now, use custom HTML. Later we'll create SendGrid templates
      const html = this.generateGiftCardHTML(data, storeInfo);
      
      return await this.sendEmail({
        to: data.recipientEmail,
        subject: `You've received a gift card from ${storeInfo.storeName}!`,
        html
      });
    } catch (error) {
      console.error('❌ Failed to send gift card email:', error);
      return false;
    }
  }

  /**
   * Send receipt email
   */
  async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    try {
      const html = this.generateReceiptHTML(data);
      
      return await this.sendEmail({
        to: data.customerEmail,
        subject: `🌸 Your receipt from Bloom Flower Shop - ${data.transactionNumber}`,
        html: html
      });
    } catch (error) {
      console.error('❌ Failed to send receipt email:', error);
      return false;
    }
  }

  /**
   * Send gift card receipt email
   */
  async sendGiftCardReceiptEmail(data: GiftCardReceiptEmailData): Promise<boolean> {
    try {
      const storeInfo = await this.getStoreInfo();
      const html = buildGiftCardReceiptEmail({
        storeName: storeInfo.storeName,
        storeEmail: storeInfo.storeEmail,
        storePhone: storeInfo.storePhone,
        storeAddress: storeInfo.storeAddress,
        purchaserName: data.purchaserName,
        cards: data.cards,
        totalAmount: data.totalAmount,
      });

      return await this.sendEmail({
        to: data.purchaserEmail,
        subject: `${storeInfo.storeName} gift card receipt - $${data.totalAmount.toFixed(2)}`,
        html
      });
    } catch (error) {
      console.error('❌ Failed to send gift card receipt email:', error);
      return false;
    }
  }

  /**
   * Test email sending
   */
  async sendTestEmail(toEmail: string): Promise<boolean> {
    return await this.sendEmail({
      to: toEmail,
      subject: '🌸 Test Email from Bloom Flower Shop',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #597485;">🌸 Bloom Flower Shop</h1>
          <p>This is a test email to verify SendGrid integration is working!</p>
          <p>If you received this email, the integration is successful.</p>
          <hr style="border: 1px solid #597485; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is a test email from your Bloom Flower Shop management system.
          </p>
        </div>
      `
    });
  }

  /**
   * Generate gift card HTML email
   */
  private generateGiftCardHTML(data: GiftCardEmailData, storeInfo: StoreEmailInfo): string {
    const template = this.getGiftCardTemplate();
    const storeContactLines = [
      storeInfo.storePhone ? `Phone: ${storeInfo.storePhone}` : null,
      storeInfo.storeEmail || null,
      storeInfo.storeAddress || null,
    ].filter(Boolean);
    const storeContactHtml = storeContactLines
      .map((line) => `<p style="color:#999;font-size:12px;margin:4px 0;">${line}</p>`)
      .join('');
    const logoHtml = storeInfo.logoUrl
      ? `<img src="${storeInfo.logoUrl}" alt="${storeInfo.storeName} logo" style="max-width:160px; max-height:60px; object-fit:contain;" />`
      : `<h1 style="color: #111827; font-size: 28px; margin: 0;">${storeInfo.storeName}</h1>`;

    if (template) {
      const purchaserName = data.purchaserName || 'A friend';
      const purchaserSection = purchaserName;

      const messageSection = data.message
        ? `
        <div
          style="background: rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; margin-bottom: 16px; font-style: italic; line-height: 1.5;"
        >
          "${data.message}"
        </div>
      `
        : '';

      const redeemButton = data.redeemUrl
        ? `
        <a
          href="${data.redeemUrl}"
          style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;"
        >Shop now</a>
      `
        : '';

      const replacements: Record<string, string> = {
        '{{recipientName}}': data.recipientName || 'Gift Card Recipient',
        '{{giftCardNumber}}': data.giftCardNumber,
        '{{amount}}': data.amount.toFixed(2),
        '{{purchaserSection}}': purchaserSection,
        '{{messageSection}}': messageSection,
        '{{redeemButton}}': redeemButton,
        '{{storeName}}': storeInfo.storeName,
        '{{storeEmail}}': storeInfo.storeEmail || '',
        '{{storePhone}}': storeInfo.storePhone || '',
        '{{storeAddress}}': storeInfo.storeAddress || '',
        '{{storeContact}}': storeContactHtml,
        '{{logoHtml}}': logoHtml,
      };

      let html = template;
      for (const [token, value] of Object.entries(replacements)) {
        html = html.split(token).join(value);
      }

      return html;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gift Card from ${storeInfo.storeName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f8f8;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">

            <div style="text-align: center; margin-bottom: 30px;">
              ${logoHtml}
              <p style="color: #6b7280; font-size: 16px; margin: 10px 0 0 0;">Digital Gift Card</p>
            </div>

            <div style="background: #0f0a2e; border-radius: 18px; padding: 28px; color: white;">
              <div style="height: 6px; border-radius: 999px; background: linear-gradient(90deg, #e8643c 0%, #f4456e 50%, #8b6cc1 100%); margin-bottom: 20px;"></div>
              <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.6);">${storeInfo.storeName}</div>
              <div style="font-size: 42px; font-weight: 700; margin: 12px 0 18px;">$${data.amount.toFixed(2)}</div>

              <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.6);">To</div>
                <div style="font-size: 20px; font-weight: 600;">${data.recipientName || 'Gift Card Recipient'}</div>
              </div>

              ${data.message ? `
                <div style="background: rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; margin-bottom: 16px; font-style: italic; line-height: 1.5;">
                  "${data.message}"
                </div>
              ` : ''}

              <div>
                <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.6);">From</div>
                <div style="font-size: 18px; font-weight: 500;">${data.purchaserName || 'A friend'}</div>
              </div>

              <div style="margin-top: 20px; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-family: monospace; letter-spacing: 2px; font-size: 18px;">${data.giftCardNumber}</div>
                <div style="margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.7);">Gift card code</div>
              </div>
            </div>

            <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #0f0a2e; font-size: 16px; margin: 0 0 12px 0;">How to use your gift card</h3>
              <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Enter the gift card code during checkout</li>
                <li>Use online, in-store, or over the phone</li>
                <li>No expiration date</li>
                <li>Remaining balance stays on the card</li>
              </ul>
            </div>

            ${data.redeemUrl ? `
              <div style="text-align: center; margin: 20px 0 10px;">
                <a href="${data.redeemUrl}" style="background: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                  Shop now
                </a>
              </div>
            ` : ''}

            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              ${storeContactHtml || `<p style="color:#999;font-size:12px;margin:4px 0;">${storeInfo.storeName}</p>`}
              <p style="color:#b0b0b0; font-size: 11px; margin: 6px 0 0;">
                This digital gift card was sent from our secure system.
              </p>
            </div>

          </div>
        </body>
      </html>
    `;
  }

  private async getStoreInfo(): Promise<StoreEmailInfo> {
    try {
      const settings = await prisma.storeSettings.findFirst();
      const storeName = (settings?.storeName || '').trim() || 'Flower Shop';
      const storeEmail = (settings?.email || '').trim() || undefined;
      const storePhone = (settings?.phone || '').trim() || undefined;
      const addressLine = (settings?.address || '').trim();
      const cityLine = [settings?.city, settings?.state, settings?.zipCode]
        .filter(Boolean)
        .join(', ');
      const storeAddress = [addressLine, cityLine].filter(Boolean).join(', ') || undefined;
      const logoUrl = (settings?.logoUrl || '').trim() || undefined;

      return {
        storeName,
        storeEmail,
        storePhone,
        storeAddress,
        logoUrl,
      };
    } catch (error) {
      console.error('❌ Failed to load store settings for email:', error);
      return {
        storeName: 'Flower Shop',
      };
    }
  }

  private getGiftCardTemplate(): string | null {
    if (this.giftCardTemplateCache !== undefined) {
      return this.giftCardTemplateCache;
    }

    try {
      const templatePaths = [
        path.resolve(process.cwd(), 'templates', 'gift-card-email.html'),
        path.resolve(process.cwd(), '..', 'templates', 'gift-card-email.html'),
      ];
      const resolvedPath = templatePaths.find((candidate) => fs.existsSync(candidate));

      if (!resolvedPath) {
        throw new Error('Gift card template not found');
      }

      this.giftCardTemplateCache = fs.readFileSync(resolvedPath, 'utf-8');
    } catch (error) {
      if (!this.warnedMissingGiftCardTemplate) {
        console.warn('Gift card email template not found. Using default HTML.');
        this.warnedMissingGiftCardTemplate = true;
      }
      this.giftCardTemplateCache = null;
    }

    return this.giftCardTemplateCache;
  }

  /**
   * Send a custom email with template replacement
   */
  async sendCustomEmail(options: {
    to: string;
    subject: string;
    htmlContent: string;
    recipientName?: string;
  }): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${options.subject}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #597485; font-size: 28px; margin: 0;">🌸 Bloom Flower Shop</h1>
              </div>

              <!-- Content -->
              <div style="color: #333; line-height: 1.6; font-size: 16px;">
                ${options.htmlContent}
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                  Thank you for choosing Bloom Flower Shop! 🌸
                </p>
                <p style="color: #999; font-size: 12px; margin: 5px 0;">
                  This is an automated notification from our system.
                </p>
              </div>

            </div>
          </body>
        </html>
      `;

      return await this.sendEmail({
        to: options.to,
        subject: options.subject,
        html
      });
    } catch (error) {
      console.error('Error sending custom email:', error);
      return false;
    }
  }

  /**
   * Generate receipt HTML email
   */
  private generateReceiptHTML(data: ReceiptEmailData): string {
    const paymentMethodsList = data.paymentMethods.map(pm => 
      `<tr><td style="padding: 5px 0; color: #333;">${pm.type.toUpperCase()}</td><td style="padding: 5px 0; text-align: right; color: #333;">$${pm.amount.toFixed(2)}</td></tr>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt from Bloom Flower Shop</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #597485; font-size: 28px; margin: 0;">🌸 Bloom Flower Shop</h1>
              <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Payment Receipt</p>
            </div>

            <!-- Transaction Info -->
            <div style="background: #f8f8f8; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #597485; font-size: 18px; margin: 0 0 15px 0;">Transaction Details</h2>
              <p style="margin: 5px 0; color: #333;"><strong>Transaction #:</strong> ${data.transactionNumber}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Customer:</strong> ${data.customerName}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Order #s:</strong> ${data.orderNumbers.join(', ')}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <!-- Payment Summary -->
            <div style="background: #f0f8ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #597485; font-size: 18px; margin: 0 0 15px 0;">Payment Summary</h3>
              <div style="border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 15px;">
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${paymentMethodsList}
                </ul>
              </div>
              <p style="font-size: 20px; font-weight: bold; color: #597485; margin: 0; text-align: right;">
                Total: $${data.totalAmount.toFixed(2)}
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px; margin: 5px 0;">
                Thank you for choosing Bloom Flower Shop! 🌸
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                Keep this receipt for your records.
              </p>
            </div>

          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
