import { useState, useEffect } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import { useGiftCard } from "@shared/hooks/useGiftCard";

type Props = {
  onGiftCardChange?: (amount: number, redemptionData?: any) => void; // ✅ Add redemption data
  grandTotal: number;
};

const GiftCardInput: React.FC<Props> = ({ onGiftCardChange, grandTotal }) => {
  const [giftCardNumber, setGiftCardNumber] = useState<string>('');
  const [giftCardAmount, setGiftCardAmount] = useState<number>(0);
  const [appliedGiftCards, setAppliedGiftCards] = useState<any[]>([]); // ✅ Support multiple cards

  const {
    checkBalance,
    clearCard,
    isChecking,
    isValid: isGiftCardValid,
    balance: giftCardBalance,
    errorMessage: giftCardError
  } = useGiftCard();

  const handleCheckGiftCard = async () => {
    if (!giftCardNumber.trim()) return;
    await checkBalance(giftCardNumber.trim().toUpperCase());
  };

  const handleApplyGiftCard = async () => {
    if (!isGiftCardValid || !giftCardAmount || giftCardAmount <= 0) return;
    
    if (giftCardAmount > giftCardBalance) {
      alert(`Amount cannot exceed available balance of $${giftCardBalance.toFixed(2)}`);
      return;
    }

    // Calculate total already applied
    const totalApplied = appliedGiftCards.reduce((sum, card) => sum + card.amountUsed, 0);
    const remainingTotal = grandTotal - totalApplied;
    
    if (giftCardAmount > remainingTotal) {
      alert(`Amount cannot exceed remaining order total of $${remainingTotal.toFixed(2)}`);
      return;
    }

    // ✅ CHANGED: Don't redeem yet, just store the card info
    const newCard = {
      cardNumber: giftCardNumber.trim().toUpperCase(),
      amountUsed: giftCardAmount,
      availableBalance: giftCardBalance,
      remainingBalance: giftCardBalance - giftCardAmount
    };

    const updatedCards = [...appliedGiftCards, newCard];
    setAppliedGiftCards(updatedCards);
    
    // Calculate total discount
    const totalDiscount = updatedCards.reduce((sum, card) => sum + card.amountUsed, 0);
    
    // ✅ Pass redemption data (not redeemed yet)
    onGiftCardChange?.(totalDiscount, updatedCards.map(card => ({
      cardNumber: card.cardNumber,
      amount: card.amountUsed
    })));
    
    // Reset input fields
    setGiftCardNumber('');
    setGiftCardAmount(0);
    clearCard();
  };

  const handleRemoveGiftCard = (index: number) => {
    const updatedCards = appliedGiftCards.filter((_, i) => i !== index);
    setAppliedGiftCards(updatedCards);
    
    const totalDiscount = updatedCards.reduce((sum, card) => sum + card.amountUsed, 0);
    
    if (updatedCards.length === 0) {
      onGiftCardChange?.(0, []);
    } else {
      onGiftCardChange?.(totalDiscount, updatedCards.map(card => ({
        cardNumber: card.cardNumber,
        amount: card.amountUsed
      })));
    }
  };

  useEffect(() => {
    if (isGiftCardValid && giftCardBalance > 0) {
      const totalApplied = appliedGiftCards.reduce((sum, card) => sum + card.amountUsed, 0);
      const remainingTotal = grandTotal - totalApplied;
      const maxAmount = Math.min(giftCardBalance, remainingTotal);
      setGiftCardAmount(Math.max(0, maxAmount));
    }
  }, [isGiftCardValid, giftCardBalance, grandTotal, appliedGiftCards]);

  // Calculate totals
  const totalApplied = appliedGiftCards.reduce((sum, card) => sum + card.amountUsed, 0);
  const remainingTotal = Math.max(0, grandTotal - totalApplied);

  return (
    <div>
      <Label htmlFor="giftCardNumber">Gift Card</Label>
      <div className="space-y-3">
        {/* Show remaining amount if cards are applied */}
        {appliedGiftCards.length > 0 && remainingTotal > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Remaining to pay: ${remainingTotal.toFixed(2)}
          </div>
        )}

        {/* Card Number Input - only show if there's remaining balance */}
        {remainingTotal > 0 && (
          <>
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
                    <div className="animate-spin h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCheckGiftCard}
                disabled={!giftCardNumber.trim() || isChecking}
                className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-500/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? "..." : "Check"}
              </button>
            </div>

            {/* Balance and Amount Section */}
            {isGiftCardValid && (
              <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-800 dark:text-green-200">Available Balance:</span>
                  <span className="font-medium text-green-800 dark:text-green-200">${giftCardBalance.toFixed(2)}</span>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="giftCardAmount">Amount to Use:</Label>
                    <InputField
                      id="giftCardAmount"
                      type="number"
                      value={giftCardAmount.toString()}
                      onChange={(e) => setGiftCardAmount(parseFloat(e.target.value) || 0)}
                      min="0"
                      max={Math.min(giftCardBalance, remainingTotal).toString()}
                      step={0.01}
                      className="text-right"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleApplyGiftCard}
                      disabled={!giftCardAmount || giftCardAmount <= 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {giftCardError && (
              <div className="text-sm text-red-600 dark:text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {giftCardError}
              </div>
            )}
          </>
        )}

        {/* Applied Gift Cards Display */}
        {appliedGiftCards.map((card, index) => (
          <div key={index} className="flex justify-between items-center py-2 bg-blue-50 dark:bg-blue-900/20 px-3 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM2 8h16V6H2v2zm2 3a1 1 0 011-1h1a1 1 0 010 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Gift Card: {card.cardNumber}
                </span>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Will have ${card.remainingBalance.toFixed(2)} after redemption
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800 dark:text-blue-200">
                -${card.amountUsed.toFixed(2)}
              </span>
              <button
                onClick={() => handleRemoveGiftCard(index)}
                className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                title="Remove gift card"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Summary when fully paid */}
        {remainingTotal === 0 && appliedGiftCards.length > 0 && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Order fully paid with gift cards</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftCardInput;