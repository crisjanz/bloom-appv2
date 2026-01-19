import twilio from 'twilio';
import { emailSettingsService } from './emailSettingsService';

interface SMSOptions {
  to: string;
  message: string;
}

interface ReceiptSMSData {
  customerName: string;
  phoneNumber: string;
  transactionNumber: string;
  orderNumbers: string[];
  totalAmount: number;
  paymentMethods: Array<{
    type: string;
    amount: number;
  }>;
}

interface OrderConfirmationSMSData {
  customerName: string;
  phoneNumber: string;
  orderNumber: string;
  totalAmount: number;
  deliveryDate?: string;
  deliveryTime?: string;
}

class SMSService {
  private async getTwilioClient() {
    const settings = await emailSettingsService.getSettingsWithSecrets();

    if (!settings.smsEnabled || !settings.twilioAccountSid || !settings.twilioAuthToken) {
      throw new Error('SMS is not configured');
    }

    return twilio(settings.twilioAccountSid, settings.twilioAuthToken);
  }

  private async getFromPhone() {
    const settings = await emailSettingsService.getSettingsWithSecrets();
    return settings.twilioPhoneNumber || '';
  }

  /**
   * Send a basic SMS
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      const twilioClient = await this.getTwilioClient();
      const fromPhone = await this.getFromPhone();
      const cleanFromPhone = this.formatPhoneNumber(fromPhone);

      if (!cleanFromPhone) {
        console.error('❌ SMS from phone is not configured:', fromPhone);
        return false;
      }

      // Validate phone number format
      const cleanPhone = this.formatPhoneNumber(options.to);
      if (!cleanPhone) {
        console.error('❌ Invalid phone number format:', options.to);
        return false;
      }

      console.log('📱 Sending SMS:', {
        to: cleanPhone,
        message: options.message.substring(0, 50) + '...'
      });

      const message = await twilioClient.messages.create({
        body: options.message,
        from: cleanFromPhone,
        to: cleanPhone
      });

      console.log('✅ SMS sent successfully:', message.sid);
      return true;
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send receipt SMS notification
   */
  async sendReceiptSMS(data: ReceiptSMSData): Promise<boolean> {
    try {
      const message = this.generateReceiptMessage(data);
      
      console.log('📱 Generated receipt SMS message:', message);
      console.log('📱 Message length:', message.length);
      
      return await this.sendSMS({
        to: data.phoneNumber,
        message: message
      });
    } catch (error) {
      console.error('❌ Failed to send receipt SMS:', error);
      return false;
    }
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmationSMS(data: OrderConfirmationSMSData): Promise<boolean> {
    try {
      const message = this.generateOrderConfirmationMessage(data);
      
      return await this.sendSMS({
        to: data.phoneNumber,
        message: message
      });
    } catch (error) {
      console.error('❌ Failed to send order confirmation SMS:', error);
      return false;
    }
  }

  /**
   * Send custom SMS with template content
   */
  async sendCustomSMS(options: {
    phoneNumber: string;
    message: string;
  }): Promise<boolean> {
    try {
      return await this.sendSMS({
        to: options.phoneNumber,
        message: options.message
      });
    } catch (error) {
      console.error('❌ Failed to send custom SMS:', error);
      return false;
    }
  }

  /**
   * Send test SMS
   */
  async sendTestSMS(phoneNumber: string): Promise<boolean> {
    const message = `Test SMS from Bloom Flower Shop!

This is a test message to verify SMS integration is working. If you received this, the setup is successful!`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message: message
    });
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle various formats
    if (digits.length === 10) {
      // Assume US number, add +1
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US number with country code
      return `+${digits}`;
    } else if (digits.length > 10 && !digits.startsWith('1')) {
      // International number without + sign
      return `+${digits}`;
    } else if (phone.startsWith('+')) {
      // Already formatted
      return phone;
    }
    
    return null;
  }

  /**
   * Normalize phone number to E.164 format for matching
   */
  normalizePhoneNumber(phone: string): string | null {
    return this.formatPhoneNumber(phone);
  }

  /**
   * Generate receipt SMS message
   */
  private generateReceiptMessage(data: ReceiptSMSData): string {
    const paymentSummary = data.paymentMethods.length > 0
      ? data.paymentMethods
          .map(pm => `${pm.type.toUpperCase()}: $${pm.amount.toFixed(2)}`)
          .join(', ')
      : `$${data.totalAmount.toFixed(2)}`;

    let message = `Bloom Flower Shop Receipt

Hi ${data.customerName}!

Transaction: ${data.transactionNumber}`;

    if (data.orderNumbers && data.orderNumbers.length > 0) {
      message += `\nOrder(s): ${data.orderNumbers.join(', ')}`;
    }

    message += `\nTotal: $${data.totalAmount.toFixed(2)}
Payment: ${paymentSummary}

Thank you for your business!

Text STOP to opt out.`;

    return message;
  }

  /**
   * Generate order confirmation SMS message
   */
  private generateOrderConfirmationMessage(data: OrderConfirmationSMSData): string {
    let message = `Bloom Flower Shop - Order Confirmed!

Hi ${data.customerName}!

Order #${data.orderNumber} confirmed
Total: $${data.totalAmount.toFixed(2)}`;

    if (data.deliveryDate) {
      message += `\nDelivery: ${data.deliveryDate}`;
      if (data.deliveryTime) {
        message += ` at ${data.deliveryTime}`;
      }
    }

    message += `

We'll update you when your order is ready!

Text STOP to opt out.`;

    return message;
  }

  /**
   * Validate if SMS service is configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      const settings = await emailSettingsService.getSettingsWithSecrets();
      const fromPhone = this.formatPhoneNumber(settings.twilioPhoneNumber || '');

      return Boolean(
        settings.smsEnabled &&
          settings.twilioAccountSid &&
          settings.twilioAuthToken &&
          fromPhone
      );
    } catch (error) {
      console.error('❌ Failed to load SMS settings:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{ configured: boolean; fromPhone: string }> {
    try {
      const settings = await emailSettingsService.getSettingsWithSecrets();
      const fromPhone = settings.twilioPhoneNumber || '';
      const configured =
        settings.smsEnabled &&
        Boolean(settings.twilioAccountSid && settings.twilioAuthToken) &&
        Boolean(this.formatPhoneNumber(fromPhone));

      return {
        configured,
        fromPhone
      };
    } catch (error) {
      console.error('❌ Failed to load SMS settings:', error);
      return {
        configured: false,
        fromPhone: ''
      };
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();
export default smsService;
