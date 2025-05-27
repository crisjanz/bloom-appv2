import React, { useState, useEffect } from "react";

type Props = {
  open: boolean;
  total: number;
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
  "Cash",
  "Debit",
  "Credit - Stripe",
  "Credit - Square",
  "Check",
  "PayPal",
  "House Account",
  "COD",
  "Wire",
  "Pay in POS",
];

export default function PaymentModal({
  open,
  total,
  onClose,
  onConfirm,
  employee,
  setFormError,
}: Props) {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("Credit - Stripe");
  const [amountInput, setAmountInput] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [checkNumber, setCheckNumber] = useState("");

  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - paidTotal;

  useEffect(() => {
    if (!open) return;

    // Reset modal state when opening
    setPayments([]);
    setSelectedMethod("Credit - Stripe");
    setAmountInput(remaining.toFixed(2));
    setCashReceived("");
    setCheckNumber("");
  }, [open]);

  useEffect(() => {
    if (remaining > 0) {
      setAmountInput(remaining.toFixed(2));
    }
    setCashReceived("");
    setCheckNumber("");
  }, [selectedMethod, remaining]);

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
  
    const defaultAmount = parseFloat(amountInput || "0");
    if (isNaN(defaultAmount) || defaultAmount <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
  
    let amount = defaultAmount;
    const newEntry: PaymentEntry = {
      method: selectedMethod,
      amount,
      metadata: {},
    };
  
    if (selectedMethod === "Cash") {
      const cashIn = parseFloat(cashReceived || "0");
      console.log("💵 Parsed cashIn and amountInput:", { cashIn, defaultAmount });
  
      if (isNaN(cashIn) || cashIn <= 0) {
        setFormError("Enter valid cash received.");
        return;
      }
  
      amount = cashIn; // ✅ Use actual cash received as the amount
      const changeDue =
        cashIn > defaultAmount ? cashIn - defaultAmount : 0;
  
      newEntry.amount = amount;
      newEntry.metadata = {
        cashReceived: cashIn,
        changeDue,
      };
    }
  
    if (selectedMethod === "Check") {
      if (!checkNumber) {
        setFormError("Enter a check number.");
        return;
      }
  
      newEntry.metadata = {
        checkNumber,
      };
    }
  
    console.log("✅ Adding payment", newEntry);
  
    setPayments((prev) => [...prev, newEntry]);
    setAmountInput(remaining.toFixed(2)); // Prefill next amount
    setCashReceived("");
    setCheckNumber("");
    setSelectedMethod("");
    setFormError("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Take Payment</h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-black hover:text-gray-600"
            title="Close"
          >
            ×
          </button>
        </div>
  
        {/* Payment Entry List */}
        {payments.length > 0 && (
          <div className="border rounded p-3 space-y-1 text-sm bg-gray-50">
            {payments.map((p, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex-1">
                  <span className="font-medium">{p.method}</span>
                  {p.metadata?.checkNumber && (
                    <span className="ml-2 text-gray-500">#{p.metadata.checkNumber}</span>
                  )}
                  {p.metadata?.cashReceived && (
                    <span className="ml-2 text-gray-500">
                      Cash: ${p.metadata.cashReceived.toFixed(2)} | Change: ${p.metadata.changeDue?.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span>${p.amount.toFixed(2)}</span>
                  <button
                    onClick={() => {
                      const updated = [...payments];
                      updated.splice(i, 1);
                      setPayments(updated);
                    }}
                    className="text-black text-lg font-bold hover:text-red-600"
                    title="Remove payment"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {/* Payment Input */}
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Payment Method */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
            <select
              className="select-primary w-full"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">Select method</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
  
          {/* Amount Due */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount</label>
            <input
              type="number"
              className="input-primary w-full"
              placeholder="Amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
  
          {/* Cash-Specific Fields */}
          {selectedMethod === "Cash" && (
            <>
              {/* Cash Received */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Cash Received</label>
                <input
                  type="number"
                  className="input-primary w-full"
                  placeholder="Cash received"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
              </div>
  
              {/* Change Due */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Change Due</label>
                <input
                  className="input-primary w-full bg-gray-100 text-gray-700"
                  readOnly
                  value={
                    cashReceived && parseFloat(cashReceived) >= parseFloat(amountInput || "0")
                      ? `$${(parseFloat(cashReceived) - parseFloat(amountInput || "0")).toFixed(2)}`
                      : "$0.00"
                  }
                />
              </div>
            </>
          )}
  
          {/* Check Number */}
          {selectedMethod === "Check" && (
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Check Number</label>
              <input
                type="text"
                className="input-primary w-full"
                placeholder="Check number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
              />
            </div>
          )}
  
          {/* Add Payment Button */}
          <div className="col-span-2">
            <button onClick={addPayment} className="btn-primary w-full">
              Add Payment
            </button>
          </div>
        </div>
  
        {/* Summary */}
        <div className="text-right pt-2 text-sm text-gray-700">
          <div>Total: ${total.toFixed(2)}</div>
          <div>Paid: ${paidTotal.toFixed(2)}</div>
          <div>Remaining: ${remaining.toFixed(2)}</div>
        </div>
  
        {/* Confirm */}
        <div className="text-right">
          <button
            className="btn-primary"
            disabled={remaining > 0}
            onClick={() => onConfirm(payments)}
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
  
}
