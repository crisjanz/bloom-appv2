// components/pos/payment/CardPaymentModal.tsx
import React, { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  total: number;
  cardType: 'credit' | 'debit';
  onComplete: (paymentData: { method: string; transactionId?: string }) => void;
  onCancel: () => void;
};

export default function CardPaymentModal({ open, total, cardType, onComplete, onCancel }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    if (open) {
      setIsProcessing(false);
      setUseManualEntry(false);
      setCardNumber('');
      setExpiry('');
      setCvv('');
    }
  }, [open]);

  const handleTerminalPayment = async () => {
    setIsProcessing(true);
    
    // Simulate terminal processing
    try {
      // Here you would integrate with your actual card terminal
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      onComplete({
        method: cardType,
        transactionId: `txn_${Date.now()}`
      });
    } catch (error) {
      setIsProcessing(false);
      // Handle error
    }
  };

  const handleManualEntry = () => {
    // Validate manual entry fields
    if (!cardNumber || !expiry || !cvv) {
      return;
    }

    onComplete({
      method: `${cardType}_manual`,
      transactionId: `manual_${Date.now()}`
    });
  };

  if (!open) return null;

  const cardIcon = cardType === 'credit' ? '💳' : '💳';
  const cardLabel = cardType === 'credit' ? 'Credit Card' : 'Debit Card';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md">
        
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{cardIcon}</div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">{cardLabel}</h2>
                <p className="text-gray-600 dark:text-gray-400">Amount: ${total.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {!useManualEntry ? (
            /* Terminal Processing */
            <div className="text-center space-y-6">
              <div className="text-6xl animate-pulse">💳</div>
              
              {isProcessing ? (
                <div>
                  <div className="text-lg font-semibold text-black dark:text-white mb-2">
                    Processing Payment...
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Please follow prompts on card reader
                  </div>
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#597485] mx-auto"></div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-semibold text-black dark:text-white mb-2">
                    Connect Card Reader
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 mb-6">
                    Insert, tap, or swipe card when ready
                  </div>
                  
                  <button
                    onClick={handleTerminalPayment}
                    className="w-full py-4 bg-[#597485] hover:bg-[#4e6575] text-white rounded-xl font-medium transition-colors mb-4"
                  >
                    Start Card Processing
                  </button>
                </div>
              )}
              
              {/* Manual Entry Toggle */}
              <div className="border-t border-stroke dark:border-strokedark pt-4">
                <button
                  onClick={() => setUseManualEntry(true)}
                  className="text-sm text-[#597485] hover:text-[#4e6575] font-medium"
                >
                  Enter card details manually instead
                </button>
              </div>
            </div>
          ) : (
            /* Manual Entry Form */
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-black dark:text-white">Enter Card Details</h3>
                <button
                  onClick={() => setUseManualEntry(false)}
                  className="text-sm text-[#597485] hover:text-[#4e6575]"
                >
                  Use card reader
                </button>
              </div>
              
              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="**** **** **** ****"
                  className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 bg-white dark:bg-boxdark text-black dark:text-white"
                />
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    Expiry
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 bg-white dark:bg-boxdark text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 bg-white dark:bg-boxdark text-black dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stroke dark:border-strokedark p-6">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {useManualEntry && (
              <button
                onClick={handleManualEntry}
                disabled={!cardNumber || !expiry || !cvv}
                className="flex-1 py-3 px-4 bg-[#597485] hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Process Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}