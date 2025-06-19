import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StatusNotificationSetting {
  id: string;
  status: string;
  displayName: string;
  description: string;
  customerEmailEnabled: boolean;
  customerSmsEnabled: boolean;
  recipientEmailEnabled: boolean;
  recipientSmsEnabled: boolean;
  customerEmailSubject: string;
  customerEmailTemplate: string;
  customerSmsTemplate: string;
  recipientEmailSubject: string;
  recipientEmailTemplate: string;
  recipientSmsTemplate: string;
}

interface NotificationSettings {
  globalEmailEnabled: boolean;
  globalSmsEnabled: boolean;
  businessHoursOnly: boolean;
  statusNotifications: StatusNotificationSetting[];
}

// Default notification settings with comprehensive templates
const DEFAULT_SETTINGS: NotificationSettings = {
  globalEmailEnabled: true,
  globalSmsEnabled: true,
  businessHoursOnly: true,
  statusNotifications: [
    {
      id: 'paid',
      status: 'PAID',
      displayName: 'Order Confirmed',
      description: 'Send when order is paid and confirmed',
      customerEmailEnabled: true,
      customerSmsEnabled: true,
      recipientEmailEnabled: false,
      recipientSmsEnabled: false,
      customerEmailSubject: 'Order Confirmation - {{orderNumber}}',
      customerEmailTemplate: 'Hi {{customerFirstName}}, your order #{{orderNumber}} has been confirmed! Total: ${{orderTotal}}. Expected delivery: {{deliveryDate}} to {{recipientName}} at {{deliveryAddress}}.',
      customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} (${{orderTotal}}) is confirmed for {{deliveryDate}}. - {{storeName}}',
      recipientEmailSubject: 'You have flowers coming! - Order {{orderNumber}}',
      recipientEmailTemplate: 'Hi {{recipientName}}, {{customerFirstName}} has sent you a beautiful floral arrangement! Expected delivery: {{deliveryDate}}.',
      recipientSmsTemplate: 'Hi {{recipientName}}! {{customerFirstName}} sent you flowers - delivery on {{deliveryDate}}. - {{storeName}}'
    },
    {
      id: 'in_design',
      status: 'IN_DESIGN',
      displayName: 'Order In Design',
      description: 'Send when order moves to design phase',
      customerEmailEnabled: false,
      customerSmsEnabled: false,
      recipientEmailEnabled: false,
      recipientSmsEnabled: false,
      customerEmailSubject: 'Your Order is Being Designed - {{orderNumber}}',
      customerEmailTemplate: 'Hi {{customerFirstName}}, our designers are now working on your beautiful arrangement for order #{{orderNumber}}.',
      customerSmsTemplate: 'Hi {{customerFirstName}}! Our designers are creating your order #{{orderNumber}}. - {{storeName}}',
      recipientEmailSubject: 'Your flowers are being designed!',
      recipientEmailTemplate: 'Hi {{recipientName}}, your floral arrangement from {{customerFirstName}} is being carefully designed by our team.',
      recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} are being designed. - {{storeName}}'
    },
    {
      id: 'ready',
      status: 'READY',
      displayName: 'Order Ready',
      description: 'Send when order is ready for pickup/delivery',
      customerEmailEnabled: true,
      customerSmsEnabled: false,
      recipientEmailEnabled: false,
      recipientSmsEnabled: true,
      customerEmailSubject: 'Your Order is Ready - {{orderNumber}}',
      customerEmailTemplate: 'Hi {{customerFirstName}}, your order #{{orderNumber}} is ready! {{#if isPickup}}Available for pickup during business hours.{{else}}We will deliver it to {{recipientName}} on {{deliveryDate}}.{{/if}}',
      customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} is {{#if isPickup}}ready for pickup{{else}}ready for delivery on {{deliveryDate}}{{/if}}. - {{storeName}}',
      recipientEmailSubject: 'Your flowers are ready for delivery!',
      recipientEmailTemplate: 'Hi {{recipientName}}, your flowers from {{customerFirstName}} are ready and will be delivered on {{deliveryDate}}!',
      recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} are ready for delivery on {{deliveryDate}}. - {{storeName}}'
    },
    {
      id: 'out_for_delivery',
      status: 'OUT_FOR_DELIVERY',
      displayName: 'Out for Delivery',
      description: 'Send when order is out for delivery',
      customerEmailEnabled: false,
      customerSmsEnabled: true,
      recipientEmailEnabled: false,
      recipientSmsEnabled: true,
      customerEmailSubject: 'Your Order is Out for Delivery - {{orderNumber}}',
      customerEmailTemplate: 'Hi {{customerFirstName}}, your order #{{orderNumber}} is on its way to {{recipientName}} at {{deliveryAddress}}!',
      customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} is on the way to {{recipientName}}. - {{storeName}}',
      recipientEmailSubject: 'Your flowers are on the way!',
      recipientEmailTemplate: 'Hi {{recipientName}}, your flowers from {{customerFirstName}} are on their way to {{deliveryAddress}}!',
      recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} are on the way to {{deliveryAddress}}. - {{storeName}}'
    },
    {
      id: 'completed',
      status: 'COMPLETED',
      displayName: 'Order Completed',
      description: 'Send when order is delivered/picked up',
      customerEmailEnabled: true,
      customerSmsEnabled: false,
      recipientEmailEnabled: false,
      recipientSmsEnabled: false,
      customerEmailSubject: 'Order Delivered - {{orderNumber}}',
      customerEmailTemplate: 'Hi {{customerFirstName}}, your order #{{orderNumber}} has been {{#if isPickup}}picked up{{else}}delivered to {{recipientName}} at {{deliveryAddress}}{{/if}}. Thank you for choosing {{storeName}}!',
      customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} has been {{#if isPickup}}picked up{{else}}delivered to {{recipientName}}{{/if}}. Thank you! - {{storeName}}',
      recipientEmailSubject: 'Your flowers have been delivered!',
      recipientEmailTemplate: 'Hi {{recipientName}}, your beautiful flowers from {{customerFirstName}} have been delivered! We hope you enjoy them.',
      recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} have been delivered. Enjoy! - {{storeName}}'
    }
  ]
};

// GET /api/settings/notifications/order-status
export async function getOrderStatusNotificationSettings(req: Request, res: Response) {
  try {
    // Try to get existing settings from database
    const settings = await prisma.notificationSettings.findFirst({
      where: { type: 'ORDER_STATUS' }
    });
    
    if (!settings) {
      // Return default settings if none exist
      return res.json(DEFAULT_SETTINGS);
    }
    
    // Parse the stored JSON settings
    const storedSettings = JSON.parse(settings.settings) as NotificationSettings;
    res.json(storedSettings);
  } catch (error) {
    console.error('Failed to fetch notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
}

// POST /api/settings/notifications/order-status
export async function saveOrderStatusNotificationSettings(req: Request, res: Response) {
  try {
    const settingsData: NotificationSettings = req.body;
    
    // Validate the incoming data structure
    if (!settingsData.statusNotifications || !Array.isArray(settingsData.statusNotifications)) {
      return res.status(400).json({ error: 'Invalid settings data structure' });
    }
    
    // Use upsert - update if exists, create if doesn't
    const savedSettings = await prisma.notificationSettings.upsert({
      where: { 
        type: 'ORDER_STATUS'
      },
      update: {
        settings: JSON.stringify(settingsData),
        updatedAt: new Date()
      },
      create: {
        type: 'ORDER_STATUS',
        settings: JSON.stringify(settingsData),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Notification settings saved successfully',
      data: JSON.parse(savedSettings.settings)
    });
  } catch (error) {
    console.error('Failed to save notification settings:', error);
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
}