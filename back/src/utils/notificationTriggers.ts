import { PrismaClient } from '@prisma/client';
import { notificationService } from '../services/notificationService';

const prisma = new PrismaClient();

/**
 * Trigger status change notifications based on settings
 */
export async function triggerStatusNotifications(order: any, newStatus: string, previousStatus: string) {
  try {
    console.log(`🔔 Triggering notifications for order #${order.orderNumber}: ${previousStatus} → ${newStatus}`);
    
    // Load notification settings
    const settingsRecord = await prisma.notificationSettings.findFirst({
      where: { type: 'ORDER_STATUS' }
    });
    
    if (!settingsRecord) {
      console.log('📋 No notification settings found, skipping notifications');
      return;
    }
    
    const settings = JSON.parse(settingsRecord.settings);
    
    // Check if notifications are globally enabled
    if (!settings.globalEmailEnabled && !settings.globalSmsEnabled) {
      console.log('📋 All notifications globally disabled, skipping');
      return;
    }
    
    // Find settings for this status
    const statusSetting = settings.statusNotifications.find((s: any) => s.status === newStatus);
    if (!statusSetting) {
      console.log(`📋 No notification settings found for status ${newStatus}`);
      return;
    }
    
    // Get full order details with customer and recipient info
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        recipient: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!fullOrder) {
      console.log(`❌ Could not find full order details for ${order.id}`);
      return;
    }
    
    // Get store settings for template tokens
    const storeSettings = await prisma.storeSettings.findFirst();
    
    // Calculate total amount from order items
    const orderTotal = fullOrder.orderItems.reduce((sum, item) => sum + (item.rowTotal || 0), 0) / 100; // Convert from cents
    
    // Prepare template data
    const templateData = {
      customerFirstName: fullOrder.customer.firstName || '',
      customerLastName: fullOrder.customer.lastName || '',
      customerEmail: fullOrder.customer.email || '',
      customerPhone: fullOrder.customer.phone || '',
      recipientName: fullOrder.recipient ? `${fullOrder.recipient.firstName} ${fullOrder.recipient.lastName}`.trim() : '',
      recipientFirstName: fullOrder.recipient?.firstName || '',
      deliveryAddress: fullOrder.recipient ? `${fullOrder.recipient.address1}, ${fullOrder.recipient.city}` : '',
      recipientPhone: fullOrder.recipient?.phone || '',
      orderNumber: fullOrder.orderNumber.toString(),
      orderTotal: orderTotal, // Keep as number for NotificationData compatibility
      deliveryDate: fullOrder.deliveryDate ? new Date(fullOrder.deliveryDate).toLocaleDateString() : '',
      deliveryTime: fullOrder.deliveryTime || '',
      storeName: storeSettings?.storeName || 'Bloom Flowers',
      storePhone: storeSettings?.phone || '',
      isPickup: fullOrder.type === 'PICKUP',
      newStatus: newStatus
    };
    
    const notifications = [];
    
    // Customer Email Notification
    if (statusSetting.customerEmailEnabled && settings.globalEmailEnabled && fullOrder.customer.email) {
      notifications.push({
        type: 'status_update',
        channel: 'email',
        recipient: fullOrder.customer.email,
        data: {
          ...templateData,
          subject: statusSetting.customerEmailSubject,
          template: statusSetting.customerEmailTemplate,
          recipientName: `${fullOrder.customer.firstName} ${fullOrder.customer.lastName}`.trim()
        }
      });
    }
    
    // Customer SMS Notification
    if (statusSetting.customerSmsEnabled && settings.globalSmsEnabled && fullOrder.customer.phone) {
      notifications.push({
        type: 'status_update',
        channel: 'sms',
        recipient: fullOrder.customer.phone,
        data: {
          ...templateData,
          template: statusSetting.customerSmsTemplate
        }
      });
    }
    
    // Recipient Email Notification (for deliveries) 
    // Note: Recipients don't have email addresses in our current model - only phone numbers
    // This would only work if the recipient is the same person as the customer
    if (statusSetting.recipientEmailEnabled && settings.globalEmailEnabled && fullOrder.recipient && 
        fullOrder.customer.email && fullOrder.recipient.customerId === fullOrder.customer.id) {
      notifications.push({
        type: 'status_update',
        channel: 'email', 
        recipient: fullOrder.customer.email,
        data: {
          ...templateData,
          subject: statusSetting.recipientEmailSubject,
          template: statusSetting.recipientEmailTemplate,
          recipientName: `${fullOrder.recipient.firstName} ${fullOrder.recipient.lastName}`.trim()
        }
      });
    }
    
    // Recipient SMS Notification (for deliveries)
    if (statusSetting.recipientSmsEnabled && settings.globalSmsEnabled && fullOrder.recipient?.phone) {
      notifications.push({
        type: 'status_update',
        channel: 'sms',
        recipient: fullOrder.recipient.phone,
        data: {
          ...templateData,
          template: statusSetting.recipientSmsTemplate
        }
      });
    }
    
    // Send all notifications
    if (notifications.length > 0) {
      console.log(`📬 Sending ${notifications.length} status notifications for order #${order.orderNumber}`);
      
      for (const notification of notifications) {
        try {
          // Prepare data with the correct email/phone field
          const notificationData = {
            ...notification.data,
            ...(notification.channel === 'email' ? { email: notification.recipient } : { phone: notification.recipient })
          };
          
          const results = await notificationService.sendStatusUpdate(
            [notification.channel as 'email' | 'sms'],
            notificationData
          );
          
          const result = results[0];
          if (result?.success) {
            console.log(`✅ ${notification.channel.toUpperCase()} notification sent to ${notification.recipient}`);
          } else {
            console.error(`❌ Failed to send ${notification.channel} notification: ${result?.error}`);
          }
        } catch (error) {
          console.error(`❌ Failed to send ${notification.channel} notification to ${notification.recipient}:`, error);
          // Continue with other notifications even if one fails
        }
      }
    } else {
      console.log(`📋 No notifications configured for status ${newStatus}`);
    }
    
  } catch (error) {
    console.error('❌ Error triggering status notifications:', error);
    // Don't fail the status update if notifications fail
  }
}