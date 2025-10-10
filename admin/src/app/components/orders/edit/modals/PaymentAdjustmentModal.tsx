import { useState } from 'react';
import { SaveIcon, CreditCardIcon } from '@shared/assets/icons';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';

interface PaymentAdjustmentModalProps {
  oldTotal: number;
  newTotal: number;
  originalPaymentMethod: string;
  originalCardLast4?: string;
  customerName: string;
  onComplete: (adjustmentData: PaymentAdjustmentResult) => void;
  onCancel: () => void;
}

interface PaymentAdjustmentResult {
  method: 'auto' | 'manual';
  paymentType: string;
  amount: number;
  success: boolean;
  notes: string;
  transactionId?: string;
  cashReceived?: number;
  changeDue?: number;
}

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'manual_cc', label: 'Manual Credit Card' },
  { value: 'stripe', label: 'Stripe Terminal' },
  { value: 'square', label: 'Square Terminal' },
];

const PaymentAdjustmentModal: React.FC<PaymentAdjustmentModalProps> = ({
  oldTotal,
  newTotal,
  originalPaymentMethod,
  originalCardLast4,
  customerName,
  onComplete,
  onCancel
}) => {
  const [processing, setProcessing] = useState(false);
  const [showAlternativeMethod, setShowAlternativeMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  // Cash handling states
  const [cashReceived, setCashReceived] = useState('');
  const [showCashDetails, setShowCashDetails] = useState(false);

  const difference = newTotal - oldTotal;
  const isRefund = difference < 0;
  const amount = Math.abs(difference);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(cents / 100);
  };

  const calculateChange = () => {
    const received = parseFloat(cashReceived) || 0;
    const amountDue = amount / 100; // Convert cents to dollars
    return received - amountDue;
  };

  const handleAutoCharge = async () => {
    setProcessing(true);
    
    try {
      // TODO: Replace with real payment processor integration
      // For now, simulate the payment processing
      await simulatePaymentProcessing();
      
      const result: PaymentAdjustmentResult = {
        method: 'auto',
        paymentType: originalPaymentMethod,
        amount: amount,
        success: true,
        notes: `${isRefund ? 'Refunded' : 'Charged'} ${formatCurrency(amount)} to ${originalPaymentMethod} ending in ${originalCardLast4}`,
        transactionId: `txn_${Date.now()}` // Placeholder transaction ID
      };
      
      onComplete(result);
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      
      const result: PaymentAdjustmentResult = {
        method: 'auto',
        paymentType: originalPaymentMethod,
        amount: amount,
        success: false,
        notes: `Failed to ${isRefund ? 'refund' : 'charge'} ${formatCurrency(amount)} - please process manually`,
      };
      
      onComplete(result);
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = () => {
    const received = parseFloat(cashReceived) || 0;
    const amountDue = amount / 100;
    const change = received - amountDue;
    
    if (received < amountDue) {
      alert('Cash received is less than the amount due.');
      return;
    }

    const result: PaymentAdjustmentResult = {
      method: 'manual',
      paymentType: 'cash',
      amount: amount,
      success: true,
      notes: `Cash payment: Received ${formatCurrency(received * 100)}, Change due: ${formatCurrency(change * 100)}`,
      cashReceived: received,
      changeDue: change
    };
    
    if (notes.trim()) {
      result.notes += ` - ${notes}`;
    }
    
    onComplete(result);
  };

  const handleOtherPayment = async () => {
    setProcessing(true);
    
    try {
      let paymentNotes = '';
      let transactionId = '';
      
      switch (selectedMethod) {
        case 'manual_cc':
          // TODO: Add manual CC processing form
          paymentNotes = `Manual credit card: ${isRefund ? 'Refunded' : 'Charged'} ${formatCurrency(amount)} - processed over phone`;
          transactionId = `manual_${Date.now()}`;
          break;
        case 'stripe':
          // TODO: Integrate with Stripe Terminal
          await simulateTerminalProcessing('Stripe');
          paymentNotes = `Stripe Terminal: ${isRefund ? 'Refunded' : 'Charged'} ${formatCurrency(amount)}`;
          transactionId = `stripe_${Date.now()}`;
          break;
        case 'square':
          // TODO: Integrate with Square Terminal
          await simulateTerminalProcessing('Square');
          paymentNotes = `Square Terminal: ${isRefund ? 'Refunded' : 'Charged'} ${formatCurrency(amount)}`;
          transactionId = `square_${Date.now()}`;
          break;
        default:
          paymentNotes = `Manual payment adjustment: ${formatCurrency(amount)}`;
      }
      
      if (notes.trim()) {
        paymentNotes += ` - ${notes}`;
      }
      
      const result: PaymentAdjustmentResult = {
        method: 'manual',
        paymentType: selectedMethod,
        amount: amount,
        success: true,
        notes: paymentNotes,
        transactionId
      };
      
      onComplete(result);
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      
      const result: PaymentAdjustmentResult = {
        method: 'manual',
        paymentType: selectedMethod,
        amount: amount,
        success: false,
        notes: `Failed to process ${selectedMethod} payment - please try again`,
      };
      
      onComplete(result);
    } finally {
      setProcessing(false);
    }
  };

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setShowCashDetails(method === 'cash');
    
    // Pre-fill cash received for exact amount
    if (method === 'cash' && !isRefund) {
      setCashReceived((amount / 100).toFixed(2));
    }
  };

  // Simulate payment processing - replace with real integration later
  const simulatePaymentProcessing = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('Payment declined'));
        }
      }, 2000);
    });
  };

  // Simulate terminal processing
  const simulateTerminalProcessing = (terminal: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.05) { // 95% success rate for terminals
          resolve();
        } else {
          reject(new Error(`${terminal} terminal error`));
        }
      }, 3000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100000]">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <CreditCardIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Payment Adjustment Required
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Order total has changed for {customerName}
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Original Total:</span>
                <span className="font-medium">{formatCurrency(oldTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">New Total:</span>
                <span className="font-medium">{formatCurrency(newTotal)}</span>
              </div>
              <hr className="border-gray-300 dark:border-gray-600" />
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900 dark:text-white">
                  {isRefund ? 'Refund Due:' : 'Additional Charge:'}
                </span>
                <span className={`font-bold text-lg ${isRefund ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          </div>

          {!showAlternativeMethod ? (
            /* Default: Auto Charge Option */
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCardIcon className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {originalPaymentMethod} ending in {originalCardLast4}
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {isRefund 
                    ? `Refund ${formatCurrency(amount)} to the original payment method`
                    : `Charge additional ${formatCurrency(amount)} to the card on file`
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAutoCharge}
                  disabled={processing}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="w-4 h-4" />
                      {isRefund ? 'Process Refund' : 'Charge Card'}
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowAlternativeMethod(true)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                >
                  Use different payment method
                </button>
              </div>
            </div>
          ) : (
            /* Alternative Payment Methods */
            <div className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <Select
                  options={paymentMethodOptions}
                  value={selectedMethod}
                  onChange={handleMethodChange}
                  placeholder="Select payment method"
                />
              </div>

              {/* Cash Payment Details */}
              {selectedMethod === 'cash' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Amount Due:
                      </span>
                      <span className="font-bold text-green-900 dark:text-green-100">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    
                    <div>
                      <Label>Cash Received</Label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    {cashReceived && (
                      <div className="flex justify-between items-center pt-2 border-t border-green-200 dark:border-green-700">
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Change Due:
                        </span>
                        <span className={`font-bold ${calculateChange() >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-600'}`}>
                          {formatCurrency(Math.max(0, calculateChange()) * 100)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Payment Method Instructions */}
              {selectedMethod === 'manual_cc' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    📞 Take new card details over the phone and process manually
                  </p>
                </div>
              )}

              {selectedMethod === 'stripe' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    💳 Process payment through Stripe Terminal
                  </p>
                </div>
              )}

              {selectedMethod === 'square' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ⬜ Process payment through Square Terminal
                  </p>
                </div>
              )}

              <div>
                <Label>Additional Notes (Optional)</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAlternativeMethod(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={selectedMethod === 'cash' ? handleCashPayment : handleOtherPayment}
                  disabled={processing || (selectedMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < amount / 100))}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4" />
                      {selectedMethod === 'cash' ? 'Process Cash Payment' : 'Process Payment'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onCancel}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Cancel - Handle payment adjustment later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentAdjustmentModal;