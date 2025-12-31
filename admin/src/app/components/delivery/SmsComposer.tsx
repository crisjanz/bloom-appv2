import { useState } from 'react';
import PhoneInput from '@shared/ui/forms/PhoneInput';

interface SmsComposerProps {
  onSend: (message: string, phoneNumber: string) => Promise<boolean>;
  defaultPhone: string;
}

export default function SmsComposer({ onSend, defaultPhone }: SmsComposerProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const templates = [
    {
      label: 'Delivery Reminder',
      text: 'Hi! This is Bloom Flower Shop. Your order is scheduled for delivery today. We\'ll notify you when it\'s on the way!'
    },
    {
      label: 'Running Late',
      text: 'Hi! This is Bloom Flower Shop. We\'re running a bit behind schedule today. Your delivery will arrive shortly. Thank you for your patience!'
    },
    {
      label: 'Delivered',
      text: 'Hi! This is Bloom Flower Shop. Your order has been delivered! We hope you love it. Thank you for your business!'
    }
  ];

  const handleTemplateSelect = (templateText: string) => {
    setMessage(templateText);
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

  const charCount = message.length;
  const charLimit = 160;
  const isOverLimit = charCount > charLimit;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Send SMS</h3>

      <div className="space-y-4">
        {/* Phone Number */}
        <div>
          <PhoneInput
            label="Phone Number"
            value={phoneNumber || ''}
            onChange={(value) => setPhoneNumber(value)}
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
          <div className="flex justify-between items-center mt-1">
            <p className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {charCount} / {charLimit} characters
              {isOverLimit && ' (message will be split into multiple SMS)'}
            </p>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || !phoneNumber.trim() || !message.trim()}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : '💬 Send SMS'}
        </button>
      </div>
    </div>
  );
}
