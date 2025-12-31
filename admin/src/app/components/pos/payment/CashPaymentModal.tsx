// components/pos/payment/CashPaymentModal.tsx
import { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  total: number;
  onComplete: (paymentData: { cashReceived: number; changeDue: number }) => void;
  onCancel: () => void;
};

export default function CashPaymentModal({ open, total, onComplete, onCancel }: Props) {
  const [cashReceived, setCashReceived] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCashReceived(total.toFixed(2)); // Pre-fill with exact amount
      setError('');
    }
  }, [open, total]);

  const cashAmount = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashAmount - total);
  const isValid = cashAmount >= total;

  const handleComplete = () => {
    if (!isValid) {
      setError('Cash received must be at least the total amount');
      return;
    }

    onComplete({
      cashReceived: cashAmount,
      changeDue: changeDue
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleComplete();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md">
        
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">Cash Payment</h2>
                <p className="text-gray-600 dark:text-gray-400">Amount due: ${total.toFixed(2)}</p>
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
        <div className="p-6 space-y-6">
          
          {/* Cash Received Input */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Cash Received
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg">
                $
              </span>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-4 text-xl font-semibold border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Change Due Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Change Due:</span>
              <span className={`text-2xl font-bold ${changeDue > 0 ? 'text-green-600 dark:text-green-400' : 'text-black dark:text-white'}`}>
                ${changeDue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-black dark:text-white mb-3">Quick Amounts:</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                Math.ceil(total),
                Math.ceil(total / 5) * 5,
                Math.ceil(total / 10) * 10,
                Math.ceil(total / 20) * 20
              ].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCashReceived(amount.toFixed(2))}
                  className="py-2 px-3 text-sm font-medium border border-stroke dark:border-strokedark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stroke dark:border-strokedark p-6">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={!isValid}
              className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              Complete Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}