// src/components/orders/payment/GiftCardModal.tsx
import { useState, useEffect } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import { useGiftCard } from "@shared/hooks/useGiftCard";

type Props = {
  open: boolean;
  onClose: () => void;
  onAddGiftCard: (cardData: { cardNumber: string; amount: number; balance: number }) => void;
  grandTotal: number;
  appliedGiftCards: any[];
};

const GiftCardModal: React.FC<Props> = ({ 
  open, 
  onClose, 
  onAddGiftCard, 
  grandTotal, 
  appliedGiftCards 
}) => {
  const [giftCardNumber, setGiftCardNumber] = useState<string>('');
  const [giftCardAmount, setGiftCardAmount] = useState<number>(0);

  const {
    checkBalance,
    clearCard,
    isChecking,
    isValid: isGiftCardValid,
    balance: giftCardBalance,
    errorMessage: giftCardError
  } = useGiftCard();

  // Calculate remaining balance
  const totalApplied = appliedGiftCards.reduce((sum, card) => sum + card.amount, 0);
  const remainingTotal = Math.max(0, grandTotal - totalApplied);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setGiftCardNumber('');
      setGiftCardAmount(0);
      clearCard();
    }
  }, [open, clearCard]);

  // Auto-set amount when card is validated
  useEffect(() => {
    if (isGiftCardValid && giftCardBalance > 0) {
      const maxAmount = Math.min(giftCardBalance, remainingTotal);
      setGiftCardAmount(maxAmount);
    }
  }, [isGiftCardValid, giftCardBalance, remainingTotal]);

  const handleCheckGiftCard = async () => {
    if (!giftCardNumber.trim()) return;
    await checkBalance(giftCardNumber.trim().toUpperCase());
  };

  const handleAddCard = () => {
    if (!isGiftCardValid || !giftCardAmount || giftCardAmount <= 0) return;
    
    if (giftCardAmount > giftCardBalance) {
      alert(`Amount cannot exceed available balance of $${giftCardBalance.toFixed(2)}`);
      return;
    }
    
    if (giftCardAmount > remainingTotal) {
      alert(`Amount cannot exceed remaining order total of $${remainingTotal.toFixed(2)}`);
      return;
    }

    // Check if card already applied
    const existingCard = appliedGiftCards.find(
      card => card.cardNumber === giftCardNumber.trim().toUpperCase()
    );
    if (existingCard) {
      alert('This gift card has already been applied');
      return;
    }

    onAddGiftCard({
      cardNumber: giftCardNumber.trim().toUpperCase(),
      amount: giftCardAmount,
      balance: giftCardBalance
    });

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-default w-full max-w-md">
        
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black dark:text-white">Add Gift Card</h2>
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

        <div className="p-6 space-y-4">
          {/* Remaining Balance Info */}
          {remainingTotal < grandTotal && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Remaining to pay: <span className="font-semibold">${remainingTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Card Number Input */}
          <div>
            <Label htmlFor="giftCardNumber">Gift Card Number</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <InputField
                  id="giftCardNumber"
                  type="text"
                  placeholder="Enter gift card number"
                  value={giftCardNumber}
                  onChange={(e) => setGiftCardNumber(e.target.value.toUpperCase())}
                  className={`${
                    isGiftCardValid ? 'border-green-500' : 
                    giftCardError ? 'border-red-500' : ''
                  }`}
                  disabled={isChecking}
                />
                {isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-[#597485] border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCheckGiftCard}
                disabled={!giftCardNumber.trim() || isChecking}
                className="px-4 py-2 bg-[#597485] text-white rounded-md hover:bg-[#597485]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? "..." : "Check"}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {giftCardError && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {giftCardError}
            </div>
          )}

          {/* Balance and Amount Section */}
          {isGiftCardValid && (
            <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800 dark:text-green-200">Available Balance:</span>
                <span className="font-semibold text-green-800 dark:text-green-200">
                  ${giftCardBalance.toFixed(2)}
                </span>
              </div>
              
              <div>
                <Label htmlFor="giftCardAmount">Amount to Use</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <InputField
                    id="giftCardAmount"
                    type="number"
                    value={giftCardAmount.toString()}
                    onChange={(e) => setGiftCardAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={Math.min(giftCardBalance, remainingTotal).toString()}
                    step={0.01}
                    className="pl-8 text-right"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Max: ${Math.min(giftCardBalance, remainingTotal).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCard}
              disabled={!isGiftCardValid || !giftCardAmount || giftCardAmount <= 0}
              className="px-4 py-2 bg-[#597485] text-white rounded-md hover:bg-[#597485]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Gift Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCardModal;