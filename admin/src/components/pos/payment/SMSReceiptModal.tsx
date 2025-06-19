import React, { useState, useEffect } from 'react';
import { CloseIcon, ChatIcon, CheckCircleIcon, AlertIcon } from '../../../icons';

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#597485] bg-opacity-10 rounded-lg">
              <ChatIcon className="w-5 h-5 text-[#597485]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Send SMS Receipt
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              {customerName ? `Send receipt to ${customerName} via SMS` : 'Send receipt via SMS'}
            </p>
            
            {customerPhone && (
              <div className="flex items-center space-x-2 text-sm text-[#597485] bg-[#597485] bg-opacity-5 p-3 rounded-lg mb-4">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Using saved phone number from customer profile</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="(604) 217-5706"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-[#597485] transition-colors ${
                !isValid && phone.length > 0
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              autoFocus
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
                  ? 'bg-[#597485] hover:bg-[#4e6575] text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Send SMS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSReceiptModal;