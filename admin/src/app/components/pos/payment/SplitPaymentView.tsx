// components/pos/payment/SplitPaymentView.tsx
import { FC, useState, useEffect } from "react";
import Select from "@shared/ui/forms/Select";
import CashPaymentModal from "./CashPaymentModal";
import CardPaymentModal from "./CardPaymentModal";
import { CreditCardIcon, DollarLineIcon, BoltIcon } from "@shared/assets/icons";

const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "other", label: "Other" },
];

type Props = {
  total: number;
  onBack: () => void;
  onComplete: (paymentMethods: Array<{ method: string; amount: number }>) => void;
};

const SplitPaymentView: FC<Props> = ({ total, onBack, onComplete }) => {
  const [splitCount, setSplitCount] = useState(2);
  const [payments, setPayments] = useState(
    Array(2).fill({ method: "cash", amount: total / 2, completed: false })
  );
  
  // Modal states
  const [activeCashModal, setActiveCashModal] = useState<number | null>(null);
  const [activeCardModal, setActiveCardModal] = useState<number | null>(null);

  useEffect(() => {
    const newAmount = total / splitCount;
    setPayments(Array(splitCount).fill(null).map((_, i) => ({
      method: payments[i]?.method || "cash",
      amount: newAmount,
      completed: payments[i]?.completed || false,
    })));
  }, [splitCount, total]);

  // Check if all payments are completed and trigger onComplete
  useEffect(() => {
    const allCompleted = payments.every(p => p.completed);
    
    if (allCompleted && payments.length > 0) {
      const paymentMethods = payments.map(p => ({
        method: p.method,
        amount: p.amount
      }));
      
      // Small delay for better UX - let user see all payments are complete
      setTimeout(() => {
        onComplete(paymentMethods);
      }, 1500);
    }
  }, [payments, onComplete]);

  const updateMethod = (index: number, method: string) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], method };
    setPayments(newPayments);
  };

  const handleCharge = (index: number) => {
    const payment = payments[index];
    
    if (payment.method === "cash") {
      setActiveCashModal(index);
    } else if (payment.method === "credit") {
      setActiveCardModal(index);
    } else {
      // Handle other payment types
      console.log(`💳 Processing ${payment.method} payment: $${payment.amount.toFixed(2)}`);
      // For "other" payments, mark as completed immediately (for demo)
      const newPayments = [...payments];
      newPayments[index] = { ...newPayments[index], completed: true };
      setPayments(newPayments);
    }
  };

  const handleCashComplete = (index: number, paymentData: { cashReceived: number; changeDue: number }) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], completed: true };
    setPayments(newPayments);
    setActiveCashModal(null);
    console.log(`✅ Cash payment completed for $${payments[index].amount.toFixed(2)}`);
  };

  const handleCardComplete = (index: number, paymentData: { method: string; transactionId?: string }) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], completed: true };
    setPayments(newPayments);
    setActiveCardModal(null);
    console.log(`✅ Card payment completed for $${payments[index].amount.toFixed(2)}`);
  };

  // Calculate progress
  const completedCount = payments.filter(p => p.completed).length;
  const totalPayments = payments.length;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={onBack}
        className="text-[#597485] hover:text-[#4e6575] text-sm font-medium"
      >
        ← Back
      </button>

      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">
          Split Payment
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how many payments you want to split the bill into.
        </p>
        
        {/* Progress indicator */}
        {completedCount > 0 && (
          <div className="mt-2 text-sm text-[#597485] font-medium">
            Progress: {completedCount} of {totalPayments} payments completed
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
          disabled={completedCount > 0} // Prevent changing split count if payments started
          className="px-3 py-1 text-lg rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >−</button>
        <span className="text-lg font-medium">{splitCount}</span>
        <button
          onClick={() => setSplitCount(splitCount + 1)}
          disabled={completedCount > 0} // Prevent changing split count if payments started
          className="px-3 py-1 text-lg rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >+</button>
      </div>

      <div className="space-y-4">
        {payments.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border p-4 shadow-sm bg-white">
            <div className="flex items-center gap-2">
              <Select
                options={paymentOptions}
                value={p.method}
                placeholder="Select payment method"
                onChange={(value) => updateMethod(i, value)}
                disabled={p.completed} // Disable changing method after payment
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="font-semibold text-lg w-20 text-center">
                ${p.amount.toFixed(2)}
              </div>
              <button
                onClick={() => handleCharge(i)}
                disabled={p.completed}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  p.completed 
                    ? 'bg-green-600 cursor-not-allowed' 
                    : 'bg-[#597485] hover:bg-[#4e6575]'
                }`}
              >
                {p.completed ? '✓ Paid' : 'Charge'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Show completion message when all payments are done */}
      {completedCount === totalPayments && totalPayments > 0 && (
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="text-green-600 dark:text-green-400 font-semibold">
            ✅ All payments completed! Processing transaction...
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      <CashPaymentModal
        open={activeCashModal !== null}
        total={activeCashModal !== null ? payments[activeCashModal].amount : 0}
        onComplete={(paymentData) => handleCashComplete(activeCashModal!, paymentData)}
        onCancel={() => setActiveCashModal(null)}
      />

      {/* Card Payment Modal */}
      <CardPaymentModal
        open={activeCardModal !== null}
        total={activeCardModal !== null ? payments[activeCardModal].amount : 0}
        cardType="credit"
        onComplete={(paymentData) => handleCardComplete(activeCardModal!, paymentData)}
        onCancel={() => setActiveCardModal(null)}
      />
    </div>
  );
};

export default SplitPaymentView;