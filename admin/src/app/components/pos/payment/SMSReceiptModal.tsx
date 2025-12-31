import { useState, useEffect } from 'react';
import { ChatIcon, CheckCircleIcon, AlertIcon } from '@shared/assets/icons';
import PhoneInput from '@shared/ui/forms/PhoneInput';
import { Modal } from '@shared/ui/components/ui/modal';

type SMSReceiptModalProps = {
  open: boolean;
  customerPhone?: string;
  customerName?: string;
  onConfirm: (phone: string) => void;
  onCancel: () => void;
};

const SMSReceiptModal: React.FC<SMSReceiptModalProps> = ({
  open,
  customerPhone,
  customerName,
  onConfirm,
  onCancel
}) => {
  const [phone, setPhone] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Auto-fill customer phone when modal opens (same pattern as EmailReceiptModal)
  useEffect(() => {
    if (open) {
      setPhone(customerPhone || '');
      setIsValid(true);
    }
  }, [open, customerPhone]);

  // Validate phone number
  useEffect(() => {
    const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/;
    setIsValid(phone.length >= 10 && phoneRegex.test(phone));
  }, [phone]);

  const handleConfirm = () => {
    if (isValid && phone.trim()) {
      onConfirm(phone.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      className="max-w-md"
    >
      <div className="flex items-center space-x-3 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-brand-500 bg-opacity-10 rounded-lg">
          <ChatIcon className="w-5 h-5 text-brand-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Send SMS Receipt
        </h3>
      </div>

      <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              {customerName ? `Send receipt to ${customerName} via SMS` : 'Send receipt via SMS'}
            </p>
            
            {customerPhone && (
              <div className="flex items-center space-x-2 text-sm text-brand-500 bg-brand-500 bg-opacity-5 p-3 rounded-lg mb-4">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Using saved phone number from customer profile</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <PhoneInput
              label="Phone Number"
              value={phone || ''}
              onChange={(value) => setPhone(value)}
              placeholder="(604) 217-5706"
            />
            {!isValid && phone.length > 0 && (
              <div className="flex items-center space-x-2 mt-2 text-sm text-red-600">
                <AlertIcon className="w-4 h-4" />
                <span>Please enter a valid phone number</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid || !phone.trim()}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                isValid && phone.trim()
                  ? 'bg-brand-500 hover:bg-brand-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Send SMS
            </button>
          </div>
        </div>
    </Modal>
  );
};

export default SMSReceiptModal;