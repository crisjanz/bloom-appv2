import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import TextArea from "@shared/ui/forms/input/TextArea";
import Button from "@shared/ui/components/ui/button/Button";
import Switch from "@shared/ui/forms/switch/Switch";
// MIGRATION: Use notification domain for settings management
// TODO: Re-enable when notification domain is fully set up
// import { useNotificationSettings } from "@domains/notifications/hooks/useNotifications";

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

const OrderStatusNotificationsCard = () => {
  // MIGRATION: Use domain hook for notification settings
  // TODO: Re-enable when notification domain is fully set up
  /*
  const { 
    settings: domainSettings, 
    isLoading: isDomainLoading, 
    isSaving: isDomainSaving, 
    updateOrderNotificationSettings,
    error: domainError 
  } = useNotificationSettings();
  */
  const domainSettings = null;
  const isDomainLoading = false;
  const isDomainSaving = false;
  const updateOrderNotificationSettings = null;

  const [settings, setSettings] = useState<NotificationSettings>({
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
        customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} (${{orderTotal}}) is confirmed for {{deliveryDate}}. - Bloom Flowers',
        recipientEmailSubject: 'You have flowers coming! - Order {{orderNumber}}',
        recipientEmailTemplate: 'Hi {{recipientName}}, {{customerFirstName}} has sent you a beautiful floral arrangement! Expected delivery: {{deliveryDate}}.',
        recipientSmsTemplate: 'Hi {{recipientName}}! {{customerFirstName}} sent you flowers - delivery on {{deliveryDate}}. - Bloom Flowers'
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
        customerSmsTemplate: 'Hi {{customerFirstName}}! Our designers are creating your order #{{orderNumber}}. - Bloom Flowers',
        recipientEmailSubject: 'Your flowers are being designed!',
        recipientEmailTemplate: 'Hi {{recipientName}}, your floral arrangement from {{customerFirstName}} is being carefully designed by our team.',
        recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} are being designed. - Bloom Flowers'
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
        customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} is {{#if isPickup}}ready for pickup{{else}}ready for delivery on {{deliveryDate}}{{/if}}. - Bloom Flowers',
        recipientEmailSubject: 'Your flowers are ready for delivery!',
        recipientEmailTemplate: 'Hi {{recipientName}}, your flowers from {{customerFirstName}} are ready and will be delivered on {{deliveryDate}}!',
        recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} are ready for delivery on {{deliveryDate}}. - Bloom Flowers'
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
        customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} is on the way to {{recipientName}}. - Bloom Flowers',
        recipientEmailSubject: 'Your flowers are on the way!',
        recipientEmailTemplate: 'Hi {{recipientName}}, your flowers from {{customerFirstName}} are on their way to {{deliveryAddress}}!',
        recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} are on the way to {{deliveryAddress}}. - Bloom Flowers'
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
        customerEmailTemplate: 'Hi {{customerFirstName}}, your order #{{orderNumber}} has been {{#if isPickup}}picked up{{else}}delivered to {{recipientName}} at {{deliveryAddress}}{{/if}}. Thank you for choosing Bloom Flowers!',
        customerSmsTemplate: 'Hi {{customerFirstName}}! Your order #{{orderNumber}} has been {{#if isPickup}}picked up{{else}}delivered to {{recipientName}}{{/if}}. Thank you! - Bloom Flowers',
        recipientEmailSubject: 'Your flowers have been delivered!',
        recipientEmailTemplate: 'Hi {{recipientName}}, your beautiful flowers from {{customerFirstName}} have been delivered! We hope you enjoy them.',
        recipientSmsTemplate: 'Hi {{recipientName}}! Your flowers from {{customerFirstName}} have been delivered. Enjoy! - Bloom Flowers'
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);

  // MIGRATION: Sync with domain settings when available
  useEffect(() => {
    if (domainSettings && !isDomainLoading) {
      // Map domain settings to component settings format
      if (domainSettings.orderNotifications) {
        setSettings(prev => ({
          ...prev,
          globalEmailEnabled: domainSettings.globalEmailEnabled,
          globalSmsEnabled: domainSettings.globalSmsEnabled,
          businessHoursOnly: domainSettings.businessHoursOnly
        }));
      }
      setIsLoading(false);
    }
  }, [domainSettings, isDomainLoading]);

  // Load notification settings on mount (fallback for non-domain data)
  useEffect(() => {
    if (!domainSettings) {
      loadNotificationSettings();
    }
  }, [domainSettings]);

  const loadNotificationSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/notifications/order-status');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setIsSaving(true);
      
      // MIGRATION: Use domain hook for saving if available, fallback to direct API
      if (updateOrderNotificationSettings) {
        await updateOrderNotificationSettings(settings);
        console.log('Notification settings saved via domain hook');
      } else {
        const response = await fetch('/api/settings/notifications/order-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });

        if (response.ok) {
          console.log('Notification settings saved successfully');
        } else {
          console.error('Failed to save notification settings');
        }
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateGlobalSetting = (key: keyof Omit<NotificationSettings, 'statusNotifications'>, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateStatusNotification = (statusId: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      statusNotifications: prev.statusNotifications.map(status => 
        status.id === statusId 
          ? { ...status, [field]: value }
          : status
      )
    }));
  };

  const toggleExpanded = (statusId: string) => {
    setExpandedStatus(expandedStatus === statusId ? null : statusId);
  };

  const getTokenHelpText = () => (
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
      <p className="font-medium mb-1">Available tokens:</p>
      <div className="grid grid-cols-3 gap-x-4">
        <div>
          <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">Customer Tokens:</p>
          <p>• {"{{customerFirstName}}"} - Customer first name</p>
          <p>• {"{{customerLastName}}"} - Customer last name</p>
          <p>• {"{{customerEmail}}"} - Customer email</p>
          <p>• {"{{customerPhone}}"} - Customer phone</p>
        </div>
        <div>
          <p className="font-medium text-green-600 dark:text-green-400 mb-1">Recipient Tokens:</p>
          <p>• {"{{recipientName}}"} - Recipient full name</p>
          <p>• {"{{recipientFirstName}}"} - Recipient first name</p>
          <p>• {"{{deliveryAddress}}"} - Delivery address</p>
          <p>• {"{{recipientPhone}}"} - Recipient phone</p>
        </div>
        <div>
          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Order Tokens:</p>
          <p>• {"{{orderNumber}}"} - Order number</p>
          <p>• {"{{orderTotal}}"} - Order total amount</p>
          <p>• {"{{deliveryDate}}"} - Delivery date</p>
          <p>• {"{{deliveryTime}}"} - Delivery time</p>
          <p>• {"{{storeName}}"} - Your store name</p>
          <p>• {"{{storePhone}}"} - Your store phone</p>
        </div>
      </div>
    </div>
  );

  if (isLoading || isDomainLoading) {
    return (
      <ComponentCardCollapsible title="Order Status Notifications">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible title="Order Status Notifications">
      <div className="space-y-6">
        
        {/* Global Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Global Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border border-stroke dark:border-strokedark rounded-lg">
              <div>
                <p className="font-medium text-black dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enable email notifications globally</p>
              </div>
              <Switch
                checked={settings.globalEmailEnabled}
                onChange={(checked) => updateGlobalSetting('globalEmailEnabled', checked)}
                ariaLabel="Toggle global email notifications"
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-stroke dark:border-strokedark rounded-lg">
              <div>
                <p className="font-medium text-black dark:text-white">SMS Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enable SMS notifications globally</p>
              </div>
              <Switch
                checked={settings.globalSmsEnabled}
                onChange={(checked) => updateGlobalSetting('globalSmsEnabled', checked)}
                ariaLabel="Toggle global SMS notifications"
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-stroke dark:border-strokedark rounded-lg">
              <div>
                <p className="font-medium text-black dark:text-white">Business Hours Only</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Only send during business hours</p>
              </div>
              <Switch
                checked={settings.businessHoursOnly}
                onChange={(checked) => updateGlobalSetting('businessHoursOnly', checked)}
                ariaLabel="Toggle business hours only notifications"
              />
            </div>
          </div>
        </div>

        <hr className="border-stroke dark:border-strokedark" />

        {/* Status-Specific Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Status Notifications</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure notifications for each order status change. Templates support token replacement.
          </p>

          <div className="space-y-3">
            {settings.statusNotifications.map((status) => (
              <div key={status.id} className="border border-stroke dark:border-strokedark rounded-lg">
                
                {/* Status Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h4 className="font-medium text-black dark:text-white">{status.displayName}</h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          {status.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{status.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Customer Notifications */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Email</span>
                          <Switch
                            checked={status.customerEmailEnabled && settings.globalEmailEnabled}
                            onChange={(checked) => updateStatusNotification(status.id, 'customerEmailEnabled', checked)}
                            disabled={!settings.globalEmailEnabled}
                            ariaLabel={`Toggle customer email notification for ${status.displayName}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">SMS</span>
                          <Switch
                            checked={status.customerSmsEnabled && settings.globalSmsEnabled}
                            onChange={(checked) => updateStatusNotification(status.id, 'customerSmsEnabled', checked)}
                            disabled={!settings.globalSmsEnabled}
                            ariaLabel={`Toggle customer SMS notification for ${status.displayName}`}
                          />
                        </div>
                      </div>
                      
                      {/* Recipient Notifications */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recipient:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Email</span>
                          <Switch
                            checked={status.recipientEmailEnabled && settings.globalEmailEnabled}
                            onChange={(checked) => updateStatusNotification(status.id, 'recipientEmailEnabled', checked)}
                            disabled={!settings.globalEmailEnabled}
                            ariaLabel={`Toggle recipient email notification for ${status.displayName}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">SMS</span>
                          <Switch
                            checked={status.recipientSmsEnabled && settings.globalSmsEnabled}
                            onChange={(checked) => updateStatusNotification(status.id, 'recipientSmsEnabled', checked)}
                            disabled={!settings.globalSmsEnabled}
                            ariaLabel={`Toggle recipient SMS notification for ${status.displayName}`}
                          />
                        </div>
                      </div>
                      
                      {/* Expand Button */}
                      <button
                        onClick={() => toggleExpanded(status.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${expandedStatus === status.id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Template Settings */}
                {expandedStatus === status.id && (
                  <div className="border-t border-stroke dark:border-strokedark p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Customer Templates */}
                      <div className="space-y-4">
                        <h5 className="font-medium text-black dark:text-white flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                          Customer Notifications
                        </h5>
                        
                        {/* Customer Email Templates */}
                        {status.customerEmailEnabled && settings.globalEmailEnabled && (
                          <div className="space-y-3 p-3 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h6 className="text-sm font-medium text-blue-700 dark:text-blue-300">Email to Customer</h6>
                            
                            <InputField
                              label="Subject Line"
                              value={status.customerEmailSubject}
                              onChange={(e) => updateStatusNotification(status.id, 'customerEmailSubject', e.target.value)}
                              placeholder="Enter email subject..."
                            />
                            
                            <div>
                              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                                Email Message
                              </label>
                              <TextArea
                                value={status.customerEmailTemplate}
                                onChange={(value) => updateStatusNotification(status.id, 'customerEmailTemplate', value)}
                                placeholder="Enter email message template..."
                                rows={3}
                              />
                            </div>
                          </div>
                        )}

                        {/* Customer SMS Templates */}
                        {status.customerSmsEnabled && settings.globalSmsEnabled && (
                          <div className="space-y-3 p-3 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h6 className="text-sm font-medium text-blue-700 dark:text-blue-300">SMS to Customer</h6>
                            
                            <div>
                              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                                SMS Message (160 characters recommended)
                              </label>
                              <TextArea
                                value={status.customerSmsTemplate}
                                onChange={(value) => updateStatusNotification(status.id, 'customerSmsTemplate', value)}
                                placeholder="Enter SMS message template..."
                                rows={2}
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Length: {status.customerSmsTemplate.length} characters
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recipient Templates */}
                      <div className="space-y-4">
                        <h5 className="font-medium text-black dark:text-white flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          Recipient Notifications
                        </h5>
                        
                        {/* Recipient Email Templates */}
                        {status.recipientEmailEnabled && settings.globalEmailEnabled && (
                          <div className="space-y-3 p-3 border border-green-200 dark:border-green-800 rounded-lg">
                            <h6 className="text-sm font-medium text-green-700 dark:text-green-300">Email to Recipient</h6>
                            
                            <InputField
                              label="Subject Line"
                              value={status.recipientEmailSubject}
                              onChange={(e) => updateStatusNotification(status.id, 'recipientEmailSubject', e.target.value)}
                              placeholder="Enter email subject..."
                            />
                            
                            <div>
                              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                                Email Message
                              </label>
                              <TextArea
                                value={status.recipientEmailTemplate}
                                onChange={(value) => updateStatusNotification(status.id, 'recipientEmailTemplate', value)}
                                placeholder="Enter email message template..."
                                rows={3}
                              />
                            </div>
                          </div>
                        )}

                        {/* Recipient SMS Templates */}
                        {status.recipientSmsEnabled && settings.globalSmsEnabled && (
                          <div className="space-y-3 p-3 border border-green-200 dark:border-green-800 rounded-lg">
                            <h6 className="text-sm font-medium text-green-700 dark:text-green-300">SMS to Recipient</h6>
                            
                            <div>
                              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                                SMS Message (160 characters recommended)
                              </label>
                              <TextArea
                                value={status.recipientSmsTemplate}
                                onChange={(value) => updateStatusNotification(status.id, 'recipientSmsTemplate', value)}
                                placeholder="Enter SMS message template..."
                                rows={2}
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Length: {status.recipientSmsTemplate.length} characters
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Token Help */}
                    {(status.customerEmailEnabled || status.customerSmsEnabled || status.recipientEmailEnabled || status.recipientSmsEnabled) && (
                      <div className="mt-6 pt-4 border-t border-stroke dark:border-strokedark">
                        {getTokenHelpText()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-stroke dark:border-strokedark">
          <Button
            onClick={saveNotificationSettings}
            disabled={isSaving || isDomainSaving}
            className="bg-brand-500 hover:bg-brand-600"
          >
            {(isSaving || isDomainSaving) ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      </div>
    </ComponentCardCollapsible>
  );
};

export default OrderStatusNotificationsCard;
