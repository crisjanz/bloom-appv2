// components/orders/payment/TakeOrderPaymentModal.tsx - POS-style payment modal for TakeOrderPage
import { FC, useState } from "react";
import { getPaymentMethods, PaymentMethodConfig } from "../../../utils/paymentMethods";
import CashPaymentModal from "../../pos/payment/CashPaymentModal";
import CardPaymentModal from "../../pos/payment/CardPaymentModal";
import SplitPaymentView from "../../pos/payment/SplitPaymentView";
import InputField from "../../form/input/InputField";
import Label from "../../form/Label";

type PaymentView = 'methods' | 'split' | 'manual';

type PaymentEntry = {
  method: string;
  amount: number;
  metadata?: {
    cashReceived?: number;
    changeDue?: number;
    checkNumber?: string;
  };
};

type Props = {
  open: boolean;
  total: number;
  giftCardDiscount: number;
  onClose: () => void;
  onConfirm: (payments: PaymentEntry[]) => void;
  employee: string;
  setFormError: (val: string | null) => void;
};

const TakeOrderPaymentModal: FC<Props> = ({
  open,
  total,
  giftCardDiscount,
  onClose,
  onConfirm,
  employee,
  setFormError,
}) => {
  const [currentView, setCurrentView] = useState<PaymentView>('methods');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  
  // Modal states for single payment methods
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  
  // Manual payment entry state
  const [amountInput, setAmountInput] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [cashReceived, setCashReceived] = useState("");

  if (!open) return null;

  const adminPaymentMethods = getPaymentMethods('admin');
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Number((total - paidTotal).toFixed(2));

  // Handle payment method selection from grid
  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    
    if (method === 'split') {
      setCurrentView('split');
    } else if (method === 'cash') {
      setShowCashModal(true);
    } else if (method === 'credit' || method === 'debit') {
      setShowCardModal(true);
    } else if (method === 'send_to_pos') {
      // Handle Send to POS - create special payment entry
      handleSendToPOS();
    } else {
      // For other methods (check, wire, etc.), show manual entry
      setCurrentView('manual');
      setAmountInput(remaining.toString());
    }
  };

  // Handle Send to POS functionality
  const handleSendToPOS = () => {
    const posTransferPayment: PaymentEntry = {
      method: 'send_to_pos',
      amount: total,
      metadata: {
        transferredToPOS: true,
        transferDate: new Date().toISOString(),
        note: 'Order transferred to POS for payment processing'
      }
    };

    // Immediately confirm with this special payment type
    onConfirm([posTransferPayment]);
  };

  // Handle single payment completion (cash/card)
  const handleSinglePaymentComplete = (method: string, paymentData?: any) => {
    const paymentEntry: PaymentEntry = {
      method,
      amount: remaining,
      metadata: paymentData,
    };

    setPayments([paymentEntry]);
    setShowCashModal(false);
    setShowCardModal(false);
    
    // If this covers the full amount, we can confirm
    if (remaining <= total) {
      onConfirm([paymentEntry]);
    }
  };

  // Handle split payment completion
  const handleSplitPaymentComplete = (paymentMethods: Array<{ method: string; amount: number }>) => {
    const splitPayments: PaymentEntry[] = paymentMethods.map(pm => ({
      method: pm.method,
      amount: pm.amount,
    }));
    
    setPayments(splitPayments);
    onConfirm(splitPayments);
  };

  // Handle manual payment addition
  const addManualPayment = () => {
    if (!selectedMethod) {
      setFormError("Select a payment method.");
      return;
    }

    const amountDue = parseFloat(amountInput || "0");
    if (isNaN(amountDue) || amountDue <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }

    const newEntry: PaymentEntry = {
      method: selectedMethod,
      amount: amountDue,
      metadata: {},
    };

    if (selectedMethod === "check") {
      if (!checkNumber?.trim()) {
        setFormError("Enter a check number.");
        return;
      }
      newEntry.metadata = { checkNumber: checkNumber.trim() };
    }

    setPayments(prev => [...prev, newEntry]);
    setSelectedMethod('');
    setAmountInput('');
    setCheckNumber('');
    setFormError(null);
    setCurrentView('methods');
  };

  const removePayment = (index: number) => {
    const updated = [...payments];
    updated.splice(index, 1);
    setPayments(updated);
  };

  // Back navigation
  const handleBack = () => {
    setCurrentView('methods');
    setSelectedMethod('');
  };

  // Payment methods grid view
  if (currentView === 'methods') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="border-b border-stroke dark:border-strokedark px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-black dark:text-white">Select Payment Method</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Total Display */}
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Total: <span className="text-2xl font-bold text-[#597485]">${total.toFixed(2)}</span>
              </p>
              {giftCardDiscount > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Gift Card Applied: -${giftCardDiscount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Payment Methods Grid */}
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminPaymentMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      className={`relative w-full h-24 flex flex-col justify-center items-center rounded-xl border-2 shadow-md transition-all hover:shadow-xl
                        ${
                          isSelected
                            ? "bg-[#597485] border-[#597485] text-white"
                            : "bg-white dark:bg-boxdark border-gray-300 dark:border-strokedark hover:border-[#597485]/50 text-gray-800 dark:text-white"
                        }
                      `}
                    >
                      <div className="mb-1">{method.icon}</div>
                      <span className="text-sm font-medium text-center px-2">{method.label}</span>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white border-2 border-white flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-[#597485]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Existing Payments */}
            {payments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-black dark:text-white">Applied Payments</h3>
                <div className="border border-stroke dark:border-strokedark rounded-lg divide-y divide-stroke dark:divide-strokedark">
                  {payments.map((payment, index) => (
                    <div key={index} className="p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">{payment.method}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {payment.metadata?.checkNumber && `Check #${payment.metadata.checkNumber}`}
                          {payment.metadata?.cashReceived && (
                            <>
                              Cash Received: ${payment.metadata.cashReceived.toFixed(2)}
                              {payment.metadata.changeDue! > 0 && ` | Change: $${payment.metadata.changeDue!.toFixed(2)}`}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-black dark:text-white">${payment.amount.toFixed(2)}</span>
                        <button
                          onClick={() => removePayment(index)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Payment Button */}
            {payments.length > 0 && (
              <div className="border-t border-stroke dark:border-strokedark pt-6">
                <button
                  className={`w-full flex justify-center rounded-lg py-4 px-6 font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    remaining > 0 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={remaining > 0}
                  onClick={() => onConfirm(payments)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {remaining > 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  {remaining > 0 ? `$${remaining.toFixed(2)} Remaining` : 'Confirm Payment'}
                </button>
              </div>
            )}
          </div>

          {/* Cash Payment Modal */}
          <CashPaymentModal
            open={showCashModal}
            total={remaining}
            onComplete={(paymentData) => handleSinglePaymentComplete('cash', paymentData)}
            onCancel={() => setShowCashModal(false)}
          />

          {/* Card Payment Modal */}
          <CardPaymentModal
            open={showCardModal}
            total={remaining}
            cardType={selectedMethod === 'debit' ? 'debit' : 'credit'}
            onComplete={(paymentData) => handleSinglePaymentComplete(selectedMethod, paymentData)}
            onCancel={() => setShowCardModal(false)}
          />
        </div>
      </div>
    );
  }

  // Split payment view
  if (currentView === 'split') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <SplitPaymentView
            total={total}
            onBack={handleBack}
            onComplete={handleSplitPaymentComplete}
          />
        </div>
      </div>
    );
  }

  // Manual payment entry view
  if (currentView === 'manual') {
    const methodConfig = adminPaymentMethods.find(m => m.id === selectedMethod);
    
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md">
          
          {/* Header */}
          <div className="border-b border-stroke dark:border-strokedark px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {methodConfig?.label} Payment
              </h2>
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount</Label>
              <InputField
                type="number"
                id="amount"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Check Number Field */}
            {selectedMethod === "check" && (
              <div>
                <Label htmlFor="checkNumber">Check Number</Label>
                <InputField
                  type="text"
                  id="checkNumber"
                  placeholder="Enter check number"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addManualPayment}
                disabled={!selectedMethod || !amountInput}
                className="flex-1 py-3 px-4 bg-[#597485] hover:bg-[#4e6575] disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
              >
                Add Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TakeOrderPaymentModal;