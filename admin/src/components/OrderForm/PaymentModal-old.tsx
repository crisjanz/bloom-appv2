import React from "react";

type Props = {
    open: boolean;
    total: number;
    onClose: () => void;
    onConfirm: (method: string) => void;
    employee: string;
    setFormError: (val: string | null) => void;
  };

const paymentOptions = ["Cash", "Debit", "Credit", "Gift Card", "House Account"];

export default function PaymentModal({
    open,
    total,
    onClose,
    onConfirm,
    employee,
    setFormError,
  }: Props) {
    console.log("👤 employee value:", employee);

  
  if (!open) return null;

  return (
    
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Take Payment</h2>
          <button onClick={onClose} className="text-sm text-red-600 hover:underline">
            Cancel
          </button>
        </div>

        <div className="space-y-2">
  <p className="text-sm">Select payment method:</p>
  <div className="grid grid-cols-2 gap-2">
    {paymentOptions.map((method) => (
      <button
        key={method}
        onClick={() => {
          if (!employee) {
            setFormError("Please select an employee before taking payment.");
            onClose();
            return;
          }

          setFormError(null);
          onConfirm(method);
        }}
        className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-2 rounded"
      >
        {method}
      </button>
    ))}
  </div>
</div>


        <div className="text-right pt-4 text-sm text-gray-700">
          Total: <strong className="text-lg">${total.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
