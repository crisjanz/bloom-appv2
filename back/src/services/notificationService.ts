// Unified Notification Service
// Manages email, SMS, and future notification channels through a single interface

import { emailService } from './emailService';
import { smsService } from './smsService';

export type NotificationType = 
  | 'receipt'
  | 'order_confirmation' 
  | 'status_update'
  | 'pickup_ready'
  | 'delivery_notification'
  | 'subscription_reminder'
  | 'employee_alert'
  | 'auth_code';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook';

export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string; // For email
  template: string; // Template with {{tokens}}
}

export interface NotificationData {
  // Customer/recipient info
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  
  // Order info
  orderNumber?: string;
  orderId?: string;
  orderTotal?: number;
  
  // Transaction info
  transactionNumber?: string;
  transactionId?: string;
  
  // Delivery info
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  
  // Custom data
  [key: string]: any;
}

export interface NotificationRequest {
  type: NotificationType;
  channels: NotificationChannel[];
  data: NotificationData;
  fallback?: boolean; // If email fails, try SMS
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  constructor() {
    // Use existing service instances
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const channel of request.channels) {
      try {
        const result = await this.sendToChannel(request.type, channel, request.data);
        results.push(result);
        
        // For multiple channels, continue sending to all channels
        // Only break for fallback scenarios where we try email first, then SMS if email fails
      } catch (error) {
        results.push({
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // If fallback enabled and all primary channels failed, try SMS
    if (request.fallback && !results.some(r => r.success) && !request.channels.includes('sms')) {
      try {
        const fallbackResult = await this.sendToChannel(request.type, 'sms', request.data);
        results.push(fallbackResult);
      } catch (error) {
        results.push({
          channel: 'sms',
          success: false,
          error: error instanceof Error ? error.message : 'Fallback SMS failed'
        });
      }
    }
    
    return results;
  }

  /**
   * Send receipt notification (replaces separate email/SMS receipt endpoints)
   */
  async sendReceipt(
    channels: NotificationChannel[], 
    data: NotificationData,
    fallback: boolean = true
  ): Promise<NotificationResult[]> {
    return this.sendNotification({
      type: 'receipt',
      channels,
      data,
      fallback
    });
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(
    channels: NotificationChannel[],
    data: NotificationData
  ): Promise<NotificationResult[]> {
    return this.sendNotification({
      type: 'order_confirmation',
      channels,
      data,
      fallback: true
    });
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(
    channels: NotificationChannel[],
    data: NotificationData & { newStatus: string }
  ): Promise<NotificationResult[]> {
    return this.sendNotification({
      type: 'status_update',
      channels,
      data,
      fallback: true
    });
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    type: NotificationType,
    channel: NotificationChannel,
    data: NotificationData
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'email':
        return this.sendEmail(type, data);
      
      case 'sms':
        return this.sendSMS(type, data);
      
      case 'push':
        // Future implementation
        throw new Error('Push notifications not implemented yet');
      
      case 'webhook':
        // Future implementation
        throw new Error('Webhook notifications not implemented yet');
      
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send email using existing EmailService
   */
  private async sendEmail(type: NotificationType, data: NotificationData): Promise<NotificationResult> {
    if (!data.email) {
      throw new Error('Email address required for email notifications');
    }

    try {
      let success: boolean;
      
      switch (type) {
        case 'receipt':
          success = await emailService.sendReceiptEmail({
            customerName: `${data.firstName} ${data.lastName}`.trim() || 'Customer',
            customerEmail: data.email,
            transactionNumber: data.transactionNumber || data.transactionId || '',
            orderNumbers: data.orderNumber ? [data.orderNumber] : [],
            totalAmount: data.orderTotal || 0,
            paymentMethods: [], // Would be passed from actual payment data
            orderDetails: [] // Would be passed from actual order data
          });
          break;
          
        default:
          throw new Error(`Email template not implemented for type: ${type}`);
      }

      return {
        channel: 'email',
        success,
        messageId: success ? 'email-sent' : undefined
      };
    } catch (error) {
      return {
        channel: 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Email failed'
      };
    }
  }

  /**
   * Send SMS using existing SMSService
   */
  private async sendSMS(type: NotificationType, data: NotificationData): Promise<NotificationResult> {
    if (!data.phone) {
      throw new Error('Phone number required for SMS notifications');
    }

    try {
      let success: boolean;
      
      switch (type) {
        case 'receipt':
          success = await smsService.sendReceiptSMS({
            customerName: `${data.firstName} ${data.lastName}`.trim() || 'Customer',
            phoneNumber: data.phone,
            transactionNumber: data.transactionNumber || data.transactionId || '',
            orderNumbers: data.orderNumber ? [data.orderNumber] : [],
            totalAmount: data.orderTotal || 0,
            paymentMethods: [] // Would be passed from actual payment data
          });
          break;
          
        case 'order_confirmation':
          success = await smsService.sendOrderConfirmationSMS({
            customerName: `${data.firstName} ${data.lastName}`.trim() || 'Customer',
            phoneNumber: data.phone,
            orderNumber: data.orderNumber || '',
            totalAmount: data.orderTotal || 0,
            deliveryDate: data.deliveryDate,
            deliveryTime: data.deliveryTime
          });
          break;
          
        default:
          throw new Error(`SMS template not implemented for type: ${type}`);
      }

      return {
        channel: 'sms',
        success,
        messageId: success ? 'sms-sent' : undefined
      };
    } catch (error) {
      return {
        channel: 'sms',
        success: false,
        error: error instanceof Error ? error.message : 'SMS failed'
      };
    }
  }

  /**
   * Replace tokens in template strings
   */
  private replaceTokens(template: string, data: NotificationData): string {
    let result = template;
    
    // Replace all {{token}} patterns with data values
    Object.entries(data).forEach(([key, value]) => {
      const token = `{{${key}}}`;
      result = result.replace(new RegExp(token, 'g'), String(value || ''));
    });
    
    return result;
  }

  /**
   * Get available notification templates
   */
  getTemplates(): NotificationTemplate[] {
    return [
      {
        type: 'receipt',
        channel: 'email',
        subject: 'Receipt for {{transactionNumber}}',
        template: 'Thank you {{firstName}} for your purchase...'
      },
      {
        type: 'receipt',
        channel: 'sms',
        template: 'Hi {{firstName}}! Thank you for your purchase. Transaction: {{transactionNumber}}, Total: ${{orderTotal}}. - Bloom Flowers'
      },
      {
        type: 'order_confirmation',
        channel: 'sms',
        template: 'Hi {{firstName}}! Your order #{{orderNumber}} (${{orderTotal}}) is confirmed for {{deliveryDate}} at {{deliveryTime}}. - Bloom Flowers'
      }
    ];
  }
}