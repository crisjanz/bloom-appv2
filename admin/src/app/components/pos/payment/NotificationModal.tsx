// Unified Notification Modal
// Replaces EmailReceiptModal and SMSReceiptModal with multi-channel selection
// MIGRATION: Integrated with notification domain for unified notification system

import { FC, useState, useEffect } from "react";
import { Modal } from '@shared/ui/components/ui/modal';
import { MailIcon, ChatIcon } from "@shared/assets/icons";
import InputField from "@shared/ui/forms/input/InputField";
import Button from "@shared/ui/components/ui/button/Button";
// MIGRATION: Use notification domain - temporarily disabled for build compatibility
// TODO: Re-enable when notification domain is fully set up
/*
import { useSendNotification } from "@domains/notifications/hooks/useNotifications";
import { 
  NotificationChannel, 
  NotificationType, 
  RecipientType 
} from "@domains/notifications/entities/Notification";
*/

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionNumber?: string;
  transactionId?: string;
  total: number;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  defaultChannels?: ('email' | 'sms')[];
  title?: string;
}

interface NotificationResult {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

const NotificationModal: FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  transactionNumber,
  transactionId,
  total,
  customerEmail: initialEmail = '',
  customerPhone: initialPhone = '',
  customerName: initialName = '',
  onSuccess,
  onError,
  defaultChannels = ['email'],
  title = 'Send Receipt'
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [customerName, setCustomerName] = useState(initialName);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(defaultChannels));
  const [isLoading, setIsLoading] = useState(false);

  // Update form when props change
  useEffect(() => {
    setEmail(initialEmail);
    setPhone(initialPhone);
    setCustomerName(initialName);
    setSelectedChannels(new Set(defaultChannels));
  }, [initialEmail, initialPhone, initialName, defaultChannels, isOpen]);

  const toggleChannel = (channel: string) => {
    const newChannels = new Set(selectedChannels);
    if (newChannels.has(channel)) {
      newChannels.delete(channel);
    } else {
      newChannels.add(channel);
    }
    setSelectedChannels(newChannels);
  };

  const isChannelSelected = (channel: string) => selectedChannels.has(channel);

  // MIGRATION: Use notification domain hook instead of direct API calls
  // TODO: Re-enable when notification domain is fully set up
  /*
  const { sendNotification, isSending } = useSendNotification();
  */
  const isSending = false;

  const handleSend = async () => {
    if (selectedChannels.size === 0) {
      onError?.('Please select at least one notification method');
      return;
    }

    if (selectedChannels.has('email') && !email) {
      onError?.('Email address is required for email notifications');
      return;
    }

    if (selectedChannels.has('sms') && !phone) {
      onError?.('Phone number is required for SMS notifications');
      return;
    }

    setIsLoading(true);

    try {
      // MIGRATION: Temporarily use direct API call, will be replaced with domain service
      const response = await fetch('/api/notifications/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channels: Array.from(selectedChannels),
          customerEmail: email,
          customerPhone: phone,
          customerName: customerName,
          transactionNumber: transactionNumber || transactionId,
          transactionId,
          total
        }),
      });

      const data = await response.json();

      if (data.success) {
        const results: NotificationResult[] = data.results || [];
        const successChannels = results.filter(r => r.success).map(r => r.channel);
        const failedChannels = results.filter(r => !r.success);

        if (successChannels.length > 0) {
          const channelNames = successChannels.map(c => 
            c === 'email' ? 'email' : 'SMS'
          ).join(' and ');
          onSuccess?.(
            successChannels.length === selectedChannels.size 
              ? `Receipt sent successfully via ${channelNames}!`
              : `Receipt sent via ${channelNames}. ${failedChannels.length} channel(s) failed.`
          );
          onClose();
        } else {
          onError?.(failedChannels[0]?.error || 'Failed to send receipt');
        }
      } else {
        onError?.(data.error || 'Failed to send receipt');
      }
    } catch (error) {
      console.error('Notification send error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to send receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-md"
    >
      <div className="p-6">
        {/* Header */}
        <h2 className="text-xl font-semibold text-black dark:text-white mb-6">
          {title}
        </h2>

        {/* Content */}
        <div className="space-y-6">
          
          {/* Transaction Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Transaction</div>
            <div className="font-semibold text-black dark:text-white">
              {transactionNumber || transactionId}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: <span className="font-medium">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              Send via:
            </label>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Email Option */}
              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`
                  relative h-20 flex flex-col justify-center items-center rounded-xl border-2 transition-all
                  ${isChannelSelected('email')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-boxdark text-gray-800 dark:text-white hover:border-blue-300'
                  }
                `}
              >
                <MailIcon className={`w-6 h-6 mb-1 ${isChannelSelected('email') ? 'text-blue-600' : 'text-gray-600'}`} />
                <span className="text-xs font-medium">Email</span>
                
                {/* Selection indicator */}
                <div className={`
                  absolute top-2 right-2 w-4 h-4 rounded-full border-2 
                  ${isChannelSelected('email')
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-400 bg-transparent'
                  }
                `}>
                  {isChannelSelected('email') && (
                    <div className="w-2 h-2 rounded-full bg-white mx-auto mt-0.5" />
                  )}
                </div>
              </button>

              {/* SMS Option */}
              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                className={`
                  relative h-20 flex flex-col justify-center items-center rounded-xl border-2 transition-all
                  ${isChannelSelected('sms')
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-boxdark text-gray-800 dark:text-white hover:border-green-300'
                  }
                `}
              >
                <ChatIcon className={`w-6 h-6 mb-1 ${isChannelSelected('sms') ? 'text-green-600' : 'text-gray-600'}`} />
                <span className="text-xs font-medium">SMS</span>
                
                {/* Selection indicator */}
                <div className={`
                  absolute top-2 right-2 w-4 h-4 rounded-full border-2 
                  ${isChannelSelected('sms')
                    ? 'bg-green-600 border-green-600'
                    : 'border-gray-400 bg-transparent'
                  }
                `}>
                  {isChannelSelected('sms') && (
                    <div className="w-2 h-2 rounded-full bg-white mx-auto mt-0.5" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <InputField
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />

            {/* Conditional Email Field */}
            {isChannelSelected('email') && (
              <InputField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                required
              />
            )}

            {/* Conditional Phone Field */}
            {isChannelSelected('sms') && (
              <InputField
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (604) 217-5706"
                required
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isLoading || isSending || selectedChannels.size === 0}
            className="bg-brand-500 hover:bg-brand-600"
          >
            {(isLoading || isSending) ? 'Sending...' : `Send ${Array.from(selectedChannels).map(c => c === 'email' ? 'Email' : 'SMS').join(' & ')}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NotificationModal;