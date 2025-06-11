// PaymentModal.tsx
import React, { useState, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Select from "../form/Select";
import Label from "../form/Label";

type Props = {
  open: boolean;
  total: number;
  giftCardDiscount: number;
  onClose: () => void;
  onConfirm: (payments: PaymentEntry[]) => void;
  employee: string;
  setFormError: (val: string | null) => void;
};

type PaymentEntry = {
  method: string;
  amount: number;
  metadata?: {
    cashReceived?: number;
    changeDue?: number;
    checkNumber?: string;
  };
};

const paymentMethods = [
  { value: "Cash", label: "Cash" },
  { value: "Debit", label: "Debit" },
  { value: "Credit - Stripe", label: "Credit - Stripe" },
  { value: "Credit - Square", label: "Credit - Square" },
  { value: "Check", label: "Check" },
  { value: "PayPal", label: "PayPal" },
  { value: "House Account", label: "House Account" },
  { value: "COD", label: "COD" },
  { value: "Wire", label: "Wire" },
  { value: "Pay in POS", label: "Pay in POS" },
];

export default function PaymentModal({
  open,
  total,
  giftCardDiscount,
  onClose,
  onConfirm,
  employee,
  setFormError,
}: Props) {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [checkNumber, setCheckNumber] = useState("");

  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Number((total - paidTotal).toFixed(2));

  useEffect(() => {
    if (!open) return;

    // Reset modal state when opening
    setPayments([]);
    setSelectedMethod("");
    setAmountInput(remaining.toFixed(2));
    setCashReceived("");
    setCheckNumber("");
  }, [open]);

useEffect(() => {
  if (open && remaining > 0) {
    setAmountInput(remaining.toFixed(2));
  }
}, [remaining, open]);

  useEffect(() => {
    if (remaining > 0) {
      setAmountInput(remaining.toFixed(2));
    }
    setCashReceived("");
    setCheckNumber("");
  }, [selectedMethod, remaining]);

  useEffect(() => {
    console.log('PaymentModal:', { total, giftCardDiscount, paidTotal, remaining });
  }, [total, giftCardDiscount, paidTotal, remaining]);

  const addPayment = () => {
    console.log("🧾 Trying to add payment", {
      selectedMethod,
      amountInput,
      cashReceived,
      checkNumber,
    });
  
    if (!selectedMethod) {
      setFormError("Select a payment method.");
      return;
    }
  
    const amountDue = parseFloat(amountInput || "0");
    if (isNaN(amountDue) || amountDue <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
  
    let paymentAmount = amountDue; // Default to amount due
    const newEntry: PaymentEntry = {
      method: selectedMethod,
      amount: paymentAmount,
      metadata: {},
    };
  
    if (selectedMethod === "Cash") {
      const cashIn = parseFloat(cashReceived || "0");
      console.log("💵 Cash payment details:", { cashIn, amountDue });
  
      if (isNaN(cashIn) || cashIn <= 0) {
        setFormError("Enter valid cash received amount.");
        return;
      }

      if (cashIn < amountDue) {
        setFormError("Cash received must be at least the amount due.");
        return;
      }
  
      // ✅ FIX: Payment amount is the amount due, not cash received
      paymentAmount = amountDue;
      const changeDue = cashIn - amountDue;
  
      newEntry.amount = paymentAmount; // Amount applied to order
      newEntry.metadata = {
        cashReceived: cashIn,     // Actual cash received
        changeDue: changeDue,     // Change to give back
      };
    }
  
    if (selectedMethod === "Check") {
      if (!checkNumber?.trim()) {
        setFormError("Enter a check number.");
        return;
      }
  
      newEntry.metadata = {
        checkNumber: checkNumber.trim(),
      };
    }
  
    console.log("✅ Adding payment", newEntry);
  
    setPayments((prev) => [...prev, newEntry]);
console.log("Payment added, new payments array:", [...payments, newEntry]);

    setSelectedMethod("");
    setCashReceived("");
    setCheckNumber("");
    setFormError(null);
  };

  const removePayment = (index: number) => {
    const updated = [...payments];
    updated.splice(index, 1);
    setPayments(updated);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-default w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black dark:text-white">Process Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Payment Summary - ✅ Simplified colors */}
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-stroke dark:border-strokedark">
    <div className="grid grid-cols-4 gap-4 text-center">
      <div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Due</div>
        <div className="text-lg font-semibold text-black dark:text-white">${total.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Gift Card Applied</div>
        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">${giftCardDiscount.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Amount Paid</div>
        <div className="text-lg font-semibold text-green-600 dark:text-green-400">${paidTotal.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
        <div className="text-lg font-semibold text-red-600 dark:text-red-400">${remaining.toFixed(2)}</div>
      </div>
    </div>
  </div>

          {/* Existing Payments List */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <Label>Applied Payments</Label>
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
                            {payment.metadata.changeDue! > 0 && ` | Change Due: $${payment.metadata.changeDue!.toFixed(2)}`}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-black dark:text-white">${payment.amount.toFixed(2)}</span>
                      <button
                        onClick={() => removePayment(index)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Remove payment"
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

          {/* Add Payment Form */}
          {remaining > 0 && (
            <div className="space-y-4">
              <Label>Add Payment</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method */}
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    options={[
                      { value: "", label: "Select method..." },
                      ...paymentMethods
                    ]}
                    value={selectedMethod}
                    onChange={(value) => setSelectedMethod(value)}
                  />
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="amount">Amount Due</Label>
                  <InputField
                    type="number"
                    id="amount"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    min="0"
                    step="0.01"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Cash-Specific Fields - ✅ Simplified styling */}
              {selectedMethod === "Cash" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-stroke dark:border-strokedark">
                  <div>
                    <Label htmlFor="cashReceived">Cash Received</Label>
                    <InputField
                      type="number"
                      id="cashReceived"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      min="0"
                      step="0.01"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="changeDue">Change Due</Label>
                    <InputField
                      type="text"
                      id="changeDue"
                      className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      readOnly
                      value={
                        cashReceived && parseFloat(cashReceived) >= parseFloat(amountInput || "0")
                          ? `$${(parseFloat(cashReceived) - parseFloat(amountInput || "0")).toFixed(2)}`
                          : "$0.00"
                      }
                    />
                  </div>
                </div>
              )}

              {/* Check Number Field - ✅ Simplified styling */}
              {selectedMethod === "Check" && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-stroke dark:border-strokedark">
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

              {/* Add Payment Button */}
              <button
                onClick={addPayment}
                disabled={!selectedMethod || !amountInput}
                className="w-full flex justify-center rounded-lg py-3 px-6 font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Payment
              </button>
            </div>
          )}

          {/* Confirm Payment Button */}
  <div className="border-t border-stroke dark:border-strokedark pt-6">
    <button
      className={`w-full flex justify-center rounded-lg py-4 px-6 font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        remaining > 0 
          ? 'bg-red-600 hover:bg-red-700' 
          : 'bg-green-600 hover:bg-green-700'
      }`}
      disabled={remaining > 0 && total > 0} // Enable if remaining <= 0 or total is 0 (fully paid by gift card)
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
        </div>
      </div>
    </div>
  );
}