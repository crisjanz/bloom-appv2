import { useEffect, useState } from 'react';
import PhoneInput from '@shared/ui/forms/PhoneInput';
import { ChatIcon } from '@shared/assets/icons';
import Select from '@shared/ui/forms/Select';

interface SmsComposerProps {
  onSend: (message: string, phoneNumber: string) => Promise<boolean>;
  defaultPhone: string;
  recipientName?: string;
  address?: string;
  phoneOptions?: Array<{ label: string; value: string }>;
  variant?: 'card' | 'plain';
  showHeader?: boolean;
  className?: string;
}

export default function SmsComposer({
  onSend,
  defaultPhone,
  recipientName,
  address,
  phoneOptions = [],
  variant = 'card',
  showHeader = true,
  className = ''
}: SmsComposerProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [selectedPhone, setSelectedPhone] = useState(defaultPhone);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const confirmDeliveryTemplate = `Hi${recipientName ? ` ${recipientName}` : ''}! This is In Your Vase Flowers. We have flowers for you and need to confirm delivery details. Address: ${address || '[address]'}. Reply with best time and confirm address is correct.`;

  const templates = [
    {
      label: 'Confirm Delivery',
      text: confirmDeliveryTemplate
    }
  ];

  const handleTemplateSelect = (templateText: string) => {
    setMessage(templateText);
  };

  useEffect(() => {
    setPhoneNumber(defaultPhone || '');
    setSelectedPhone(defaultPhone || '');
  }, [defaultPhone]);

  const handlePhoneSelect = (value: string) => {
    setSelectedPhone(value);
    setPhoneNumber(value);
  };

  const handlePhoneInputChange = (value: string) => {
    setPhoneNumber(value);
    const hasOption = phoneOptions.some((option) => option.value === value);
    setSelectedPhone(hasOption ? value : '');
  };

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const success = await onSend(message, phoneNumber);
      if (success) {
        setMessage(''); // Clear message after sending
        alert('SMS sent successfully!');
      } else {
        alert('Failed to send SMS');
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      alert('Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const containerClasses = [
    variant === 'card'
      ? 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4'
      : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {showHeader && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Send SMS</h3>
      )}

      <div className="space-y-4">
        {phoneOptions.length > 0 && (
          <Select
            label="Contacts"
            options={phoneOptions}
            placeholder="Select a contact"
            value={selectedPhone}
            onChange={handlePhoneSelect}
          />
        )}
        {/* Phone Number */}
        <div>
          <PhoneInput
            label="Phone Number"
            value={phoneNumber || ''}
            onChange={handlePhoneInputChange}
            placeholder="(604) 555-1234"
          />
        </div>

        {/* Templates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Templates
          </label>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.label}
                onClick={() => handleTemplateSelect(template.text)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your message here..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || !phoneNumber.trim() || !message.trim()}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ChatIcon className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send SMS'}
        </button>
      </div>
    </div>
  );
}
