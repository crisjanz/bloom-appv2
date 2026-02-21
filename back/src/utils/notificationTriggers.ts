import { PrismaClient, CommunicationType } from '@prisma/client';
import { notificationService } from '../services/notificationService';
import { formatOrderNumber } from './formatOrderNumber';
import { getOrderNumberPrefix } from './orderNumberSettings';
import { sendPushoverNotification } from '../services/pushoverService';

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
        recipientCustomer: {
          include: {
            primaryAddress: true,
            addresses: true,
          }
        },
        deliveryAddress: true,
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

    // Skip notifications if no customer (e.g., customer was deleted)
    if (!fullOrder.customer) {
      console.log(`📋 No customer associated with order ${order.id}, skipping notifications`);
      return;
    }

    // Get store settings and order number prefix for template tokens
    const storeSettings = await prisma.storeSettings.findFirst();
    const orderNumberPrefix = await getOrderNumberPrefix(prisma);

    // Calculate total amount from order items
    const orderTotal = fullOrder.orderItems.reduce((sum, item) => sum + (item.rowTotal || 0), 0) / 100; // Convert from cents

    // Prepare template data using Customer-based recipient system
    const recipientData = fullOrder.recipientCustomer;
    const deliveryAddressData = fullOrder.deliveryAddress;

    const templateData = {
      customerFirstName: fullOrder.customer.firstName || '',
      customerLastName: fullOrder.customer.lastName || '',
      customerEmail: fullOrder.customer.email || '',
      customerPhone: fullOrder.customer.phone || '',
      recipientName: recipientData ? `${recipientData.firstName} ${recipientData.lastName}`.trim() : '',
      recipientFirstName: recipientData?.firstName || '',
      recipientEmail: recipientData?.email || '',
      deliveryAddress: deliveryAddressData ? `${deliveryAddressData.address1}, ${deliveryAddressData.city}` : '',
      recipientPhone: deliveryAddressData?.phone || '',
      orderNumber: formatOrderNumber(fullOrder.orderNumber, orderNumberPrefix),
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
    // Recipients now have their own email addresses via Customer records
    const recipientEmail = fullOrder.recipientCustomer?.email;
    if (statusSetting.recipientEmailEnabled && settings.globalEmailEnabled && recipientEmail) {
      const recipientDisplayData = fullOrder.recipientCustomer;
      notifications.push({
        type: 'status_update',
        channel: 'email',
        recipient: recipientEmail,
        data: {
          ...templateData,
          subject: statusSetting.recipientEmailSubject,
          template: statusSetting.recipientEmailTemplate,
          recipientName: recipientDisplayData ? `${recipientDisplayData.firstName} ${recipientDisplayData.lastName}`.trim() : ''
        }
      });
    }
    
    // Recipient SMS Notification (for deliveries)
    // Phone number comes from the delivery address
    const recipientPhone = deliveryAddressData?.phone;
    if (statusSetting.recipientSmsEnabled && settings.globalSmsEnabled && recipientPhone) {
      notifications.push({
        type: 'status_update',
        channel: 'sms',
        recipient: recipientPhone,
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

            // Log SMS communications to database
            if (notification.channel === 'sms') {
              try {
                await prisma.orderCommunication.create({
                  data: {
                    orderId: fullOrder.id,
                    type: CommunicationType.SMS_SENT,
                    message: notificationData.template || '',
                    recipient: notification.recipient,
                    isAutomatic: true,
                    sentVia: 'Twilio',
                    readAt: new Date()
                  }
                });
                console.log(`📝 Logged SMS communication for order #${order.orderNumber}`);

                const adminBaseUrl = process.env.ADMIN_BASE_URL || '';
                sendPushoverNotification({
                  title: `Auto SMS Sent → Order #${order.orderNumber}`,
                  message: `To: ${notification.recipient}\n${notificationData.template || ''}`,
                  group: 'sms-sent',
                  ...(adminBaseUrl ? { link: `${adminBaseUrl}/orders/${fullOrder.id}` } : {})
                });
              } catch (logError) {
                console.error('❌ Failed to log SMS communication:', logError);
                // Don't fail the notification if logging fails
              }
            }

            // Log Email communications to database
            if (notification.channel === 'email') {
              try {
                await prisma.orderCommunication.create({
                  data: {
                    orderId: fullOrder.id,
                    type: CommunicationType.EMAIL_SENT,
                    message: notificationData.template || '',
                    recipient: notification.recipient,
                    subject: notificationData.subject || '',
                    isAutomatic: true,
                    sentVia: 'SendGrid',
                    readAt: new Date()
                  }
                });
                console.log(`📝 Logged Email communication for order #${order.orderNumber}`);
              } catch (logError) {
                console.error('❌ Failed to log Email communication:', logError);
                // Don't fail the notification if logging fails
              }
            }
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
