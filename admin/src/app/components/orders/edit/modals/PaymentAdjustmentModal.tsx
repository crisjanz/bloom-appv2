import { useState } from 'react';
import { CreditCardIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import { formatCurrency } from '@shared/utils/currency';
import { useApiClient } from '@shared/hooks/useApiClient';

export interface PaymentMethod {
  id: string;
  type: 'CARD' | 'CASH' | 'CHECK' | 'GIFT_CARD' | 'STORE_CREDIT' | 'COD' | 'HOUSE_ACCOUNT' | 'OFFLINE' | 'EXTERNAL';
  provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
  amount: number;
  cardLast4?: string;
  cardBrand?: string;
  providerTransactionId?: string; // Stripe paymentIntentId
  label: string;
}

interface PaymentAdjustmentModalProps {
  orderId: string;
  oldTotal: number;
  newTotal: number;
  paymentMethods: PaymentMethod[];
  transactionId?: string; // For refunds
  onComplete: (result: PaymentAdjustmentResult) => void;
  onCancel: () => void; // Cancels and reverts the order change
}

export interface PaymentAdjustmentResult {
  success: boolean;
  amount: number;
  notes: string;
  paymentMethodType: string;
  provider: string;
  providerTransactionId?: string;
  providerRefundId?: string;
  cardLast4?: string;
  cardBrand?: string;
}

const PaymentAdjustmentModal: React.FC<PaymentAdjustmentModalProps> = ({
  orderId,
  oldTotal,
  newTotal,
  paymentMethods,
  transactionId,
  onComplete,
  onCancel
}) => {
  const apiClient = useApiClient();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods[0]?.id || ''
  );

  const difference = newTotal - oldTotal;
  const isRefund = difference < 0;
  const amount = Math.abs(difference);
  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || paymentMethods[0];

  const handleProcess = async () => {
    if (!selectedMethod) {
      setError('No payment method selected');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Card payments via Stripe
      if (selectedMethod.type === 'CARD' && selectedMethod.provider === 'STRIPE') {
        if (isRefund) {
          // Process Stripe refund
          const { data, status } = await apiClient.post('/api/stripe/refund', {
            paymentIntentId: selectedMethod.providerTransactionId,
            orderId,
            amount
          });

          if (status >= 400 || !data?.success) {
            throw new Error(data?.error || 'Failed to process refund');
          }

          onComplete({
            success: true,
            amount,
            notes: `Refunded ${formatCurrency(amount)} to ${selectedMethod.label}`,
            paymentMethodType: 'CARD',
            provider: 'STRIPE',
            providerRefundId: data.refundId,
            cardLast4: selectedMethod.cardLast4,
            cardBrand: selectedMethod.cardBrand
          });
        } else {
          // Process Stripe charge
          const { data, status } = await apiClient.post('/api/stripe/charge-saved', {
            orderId,
            amount,
            description: 'Order adjustment'
          });

          if (status >= 400 || !data?.success) {
            throw new Error(data?.error || 'Failed to charge card');
          }

          onComplete({
            success: true,
            amount,
            notes: `Charged ${formatCurrency(amount)} to ${selectedMethod.label}`,
            paymentMethodType: 'CARD',
            provider: 'STRIPE',
            providerTransactionId: data.paymentIntentId,
            cardLast4: data.cardLast4 || selectedMethod.cardLast4,
            cardBrand: data.cardBrand || selectedMethod.cardBrand
          });
        }
      } else {
        // Cash/offline payments - just record, show manual instruction
        const action = isRefund ? 'Refund' : 'Collect';
        onComplete({
          success: true,
          amount,
          notes: `${action} ${formatCurrency(amount)} via ${selectedMethod.label} (manual)`,
          paymentMethodType: selectedMethod.type,
          provider: selectedMethod.provider
        });
      }
    } catch (err) {
      console.error('Payment adjustment failed:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'CARD':
        return <CreditCardIcon className="w-5 h-5" />;
      case 'CASH':
        return <span className="text-lg">$</span>;
      default:
        return <span className="text-lg">•</span>;
    }
  };

  return (
    <Modal isOpen={true} onClose={onCancel} className="max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isRefund ? 'Process Refund' : 'Process Charge'}
        </h2>

        {/* Amount Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-5">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Original:</span>
            <span>{formatCurrency(oldTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>New:</span>
            <span>{formatCurrency(newTotal)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="font-medium text-gray-900 dark:text-white">
              {isRefund ? 'Refund:' : 'Charge:'}
            </span>
            <span className={`text-lg font-bold ${isRefund ? 'text-green-600' : 'text-blue-600'}`}>
              {formatCurrency(amount)}
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        {paymentMethods.length > 1 ? (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="space-y-2">
              {paymentMethods.map(method => (
                <label
                  key={method.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMethodId === method.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedMethodId === method.id}
                    onChange={() => setSelectedMethodId(method.id)}
                    className="text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">
                    {getMethodIcon(method.type)}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {method.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : paymentMethods.length === 1 ? (
          <div className="mb-5 p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              {getMethodIcon(paymentMethods[0].type)}
            </span>
            <span className="text-gray-900 dark:text-white">
              {paymentMethods[0].label}
            </span>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
            No payment method on file. Please collect payment manually.
          </div>
        )}

        {/* Manual collection notice for cash */}
        {selectedMethod?.type !== 'CARD' && (
          <div className="mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
            {isRefund
              ? `Please refund ${formatCurrency(amount)} to customer manually.`
              : `Please collect ${formatCurrency(amount)} from customer manually.`}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={processing || paymentMethods.length === 0}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isRefund
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              isRefund ? 'Process Refund' : 'Process Charge'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentAdjustmentModal;
