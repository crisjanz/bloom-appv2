import { FC, useState, useEffect } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';

type Props = {
  open: boolean;
  customerEmail?: string;
  customerName?: string;
  onConfirm: (email: string) => void;
  onCancel: () => void;
};

const EmailReceiptModal: FC<Props> = ({
  open,
  customerEmail = '',
  customerName = 'Customer',
  onConfirm,
  onCancel
}) => {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(true);

  // Update email when modal opens or customerEmail changes
  useEffect(() => {
    if (open) {
      setEmail(customerEmail || '');
      setIsValid(true);
    }
  }, [open, customerEmail]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleConfirm = () => {
    if (!email.trim()) {
      setIsValid(false);
      return;
    }

    if (!validateEmail(email)) {
      setIsValid(false);
      return;
    }

    setIsValid(true);
    onConfirm(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!isValid && value.trim()) {
      setIsValid(true);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      className="max-w-md"
    >
      <div className="p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-black dark:text-white mb-2">
            Email Receipt
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Send receipt to {customerName}
          </p>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="customer@example.com"
            className={`w-full px-4 py-3 border rounded-lg text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
              !isValid 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            autoFocus
          />
          {!isValid && (
            <p className="text-red-600 dark:text-red-400 text-sm">
              Please enter a valid email address
            </p>
          )}
          {customerEmail ? (
            <p className="text-green-600 dark:text-green-400 text-xs">
              ✅ This is the email from {customerName}'s profile
            </p>
          ) : (
            <p className="text-amber-600 dark:text-amber-400 text-xs">
              💡 Please enter {customerName}'s email address
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Receipt
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                Receipt includes:
              </p>
              <ul className="text-blue-700 dark:text-blue-300 text-xs mt-1 space-y-0.5">
                <li>• Transaction number and details</li>
                <li>• Payment method breakdown</li>
                <li>• Gift cards (if purchased)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmailReceiptModal;