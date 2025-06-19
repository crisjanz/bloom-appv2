import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: any;
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
  private fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomflowershop.com';
  private fromName = process.env.SENDGRID_FROM_NAME || 'Bloom Flower Shop';

  /**
   * Send a basic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const msg: any = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
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

      console.log('📧 Sending email:', {
        to: options.to,
        subject: options.subject,
        templateId: options.templateId || 'custom'
      });

      await sgMail.send(msg);
      console.log('✅ Email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send digital gift card email
   */
  async sendGiftCardEmail(data: GiftCardEmailData): Promise<boolean> {
    try {
      // For now, use custom HTML. Later we'll create SendGrid templates
      const html = this.generateGiftCardHTML(data);
      
      return await this.sendEmail({
        to: data.recipientEmail,
        subject: `🌸 You've received a gift card from Bloom Flower Shop!`,
        html: html
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
  private generateGiftCardHTML(data: GiftCardEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gift Card from Bloom Flower Shop</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #597485; font-size: 32px; margin: 0;">🌸 Bloom Flower Shop</h1>
              <p style="color: #666; font-size: 18px; margin: 10px 0 0 0;">Digital Gift Card</p>
            </div>

            <!-- Gift Card -->
            <div style="background: linear-gradient(135deg, #597485 0%, #4e6575 100%); border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              <div style="background: white; border-radius: 10px; padding: 25px; margin: 10px 0;">
                <h2 style="color: #597485; font-family: monospace; font-size: 24px; margin: 0 0 15px 0; letter-spacing: 2px;">
                  ${data.giftCardNumber}
                </h2>
                <p style="color: #597485; font-size: 36px; font-weight: bold; margin: 0;">
                  $${data.amount.toFixed(2)}
                </p>
              </div>
            </div>

            <!-- Recipient Info -->
            <div style="text-align: center; margin: 30px 0;">
              <h3 style="color: #333; font-size: 20px; margin: 0 0 10px 0;">
                Dear ${data.recipientName},
              </h3>
              ${data.purchaserName ? `
                <p style="color: #666; font-size: 16px; margin: 10px 0;">
                  You've received this gift card from <strong>${data.purchaserName}</strong>
                </p>
              ` : ''}
              ${data.message ? `
                <div style="background: #f8f8f8; border-left: 4px solid #597485; padding: 15px; margin: 20px 0; text-align: left;">
                  <p style="color: #333; font-style: italic; margin: 0; font-size: 16px;">
                    "${data.message}"
                  </p>
                </div>
              ` : ''}
            </div>

            <!-- How to Use -->
            <div style="background: #f8f8f8; border-radius: 10px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #597485; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
                How to Use Your Gift Card
              </h3>
              <ul style="color: #666; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Present this card number when placing an order</li>
                <li>Use online, in-store, or over the phone</li>
                <li>No expiration date - never expires!</li>
                <li>Remaining balance stays on your card</li>
              </ul>
            </div>

            <!-- CTA Button -->
            ${data.redeemUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.redeemUrl}" style="background: #597485; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Shop Now 🌸
                </a>
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">
                Questions? Contact us at Bloom Flower Shop
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                This digital gift card was sent from our secure system.
              </p>
            </div>

          </div>
        </body>
      </html>
    `;
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