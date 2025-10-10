import { useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Button from "@shared/ui/components/ui/button/Button";
import { getGiftCardSummary, validateGiftCardAmount } from "@shared/utils/giftCardHelpers";
import { activateGiftCard } from "@shared/legacy-services/giftCardService";

type Props = {
  open: boolean;
  onClose: () => void;
  orderItems: any[];
  onActivationComplete: (activatedCards: any[]) => void;
};

const GiftCardActivationModal: React.FC<Props> = ({
  open,
  onClose,
  orderItems,
  onActivationComplete
}) => {
  const [cardNumbers, setCardNumbers] = useState<{ [key: string]: string }>({});
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: number }>({});
  const [cardTypes, setCardTypes] = useState<{ [key: string]: 'PHYSICAL' | 'DIGITAL' }>({});
  const [recipientEmails, setRecipientEmails] = useState<{ [key: string]: string }>({});
  const [recipientNames, setRecipientNames] = useState<{ [key: string]: string }>({});
  const [activating, setActivating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

const giftCardSummary = getGiftCardSummary(orderItems);

  const handleCardNumberChange = (itemId: string, value: string) => {
    setCardNumbers(prev => ({ ...prev, [itemId]: value.toUpperCase() }));
    setErrors(prev => ({ ...prev, [itemId]: '' }));
  };

  const handleCustomAmountChange = (itemId: string, value: number) => {
    setCustomAmounts(prev => ({ ...prev, [itemId]: value }));
    const validation = validateGiftCardAmount(value);
    setErrors(prev => ({ 
      ...prev, 
      [`${itemId}_amount`]: validation.valid ? '' : validation.error || ''
    }));
  };

  const handleCardTypeChange = (itemId: string, type: 'PHYSICAL' | 'DIGITAL') => {
    setCardTypes(prev => ({ ...prev, [itemId]: type }));
    // Clear card number when switching to digital
    if (type === 'DIGITAL') {
      setCardNumbers(prev => ({ ...prev, [itemId]: '' }));
    }
    setErrors(prev => ({ ...prev, [itemId]: '', [`${itemId}_email`]: '' }));
  };

  const handleRecipientEmailChange = (itemId: string, value: string) => {
    setRecipientEmails(prev => ({ ...prev, [itemId]: value }));
    setErrors(prev => ({ ...prev, [`${itemId}_email`]: '' }));
  };

  const handleRecipientNameChange = (itemId: string, value: string) => {
    setRecipientNames(prev => ({ ...prev, [itemId]: value }));
  };

// In GiftCardActivationModal.tsx - modify the handleActivateAll function
const handleActivateAll = async () => {
  setActivating(true);
  const newErrors: { [key: string]: string } = {};
  const cardDataForActivation: any[] = []; // ✅ Changed: collect data instead of activating

  try {
    for (const item of giftCardSummary) {
      const cardType = cardTypes[item.id] || 'PHYSICAL';
      const cardNumber = cardNumbers[item.id];
      const recipientEmail = recipientEmails[item.id];
      const recipientName = recipientNames[item.id];
      
      // Validation based on card type
      if (cardType === 'PHYSICAL') {
        if (!cardNumber?.trim()) {
          newErrors[item.id] = 'Card number is required for physical cards';
          continue;
        }
      } else if (cardType === 'DIGITAL') {
        if (!recipientEmail?.trim()) {
          newErrors[`${item.id}_email`] = 'Recipient email is required for digital cards';
          continue;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
          newErrors[`${item.id}_email`] = 'Please enter a valid email address';
          continue;
        }
      }

      const amount = item.giftCardInfo.isCustomAmount 
        ? customAmounts[item.id] 
        : item.giftCardInfo.value!;

      if (item.giftCardInfo.isCustomAmount) {
        const validation = validateGiftCardAmount(amount);
        if (!validation.valid) {
          newErrors[`${item.id}_amount`] = validation.error!;
          continue;
        }
      }

      // ✅ Changed: Collect card data for each quantity (don't activate yet)
      for (let i = 0; i < item.quantity; i++) {
        cardDataForActivation.push({
          cardNumber: cardType === 'PHYSICAL' ? cardNumber : undefined, // Only for physical cards
          amount,
          type: cardType,
          recipientEmail: cardType === 'DIGITAL' ? recipientEmail : undefined,
          recipientName: recipientName || undefined,
          itemId: item.id, // ✅ Add item ID for price override
          originalProduct: item.product // ✅ Add original product reference
        });
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      // ✅ Pass card data (not activated cards) to parent
      onActivationComplete(cardDataForActivation);
    }
  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    setActivating(false);
  }
};

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Activate Gift Cards
          </h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Gift Cards List */}
        <div className="space-y-6">
          {giftCardSummary.map((item) => (
            <div
              key={item.id}
              className="border border-stroke rounded-lg p-4 dark:border-strokedark"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-black dark:text-white">
                    {item.displayName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quantity: {item.quantity}
                  </p>
                </div>
                {!item.giftCardInfo.isCustomAmount && (
                  <div className="text-lg font-semibold text-[#597485]">
                    ${item.giftCardInfo.value}
                  </div>
                )}
              </div>

              {/* Card Type Selection */}
              <div className="mb-4">
                <Label>Card Type</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`cardType-${item.id}`}
                      value="PHYSICAL"
                      checked={(cardTypes[item.id] || 'PHYSICAL') === 'PHYSICAL'}
                      onChange={() => handleCardTypeChange(item.id, 'PHYSICAL')}
                      className="mr-2"
                    />
                    🎴 Physical Card (preprinted)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`cardType-${item.id}`}
                      value="DIGITAL"
                      checked={cardTypes[item.id] === 'DIGITAL'}
                      onChange={() => handleCardTypeChange(item.id, 'DIGITAL')}
                      className="mr-2"
                    />
                    📱 Digital Card (email delivery)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Card Number (only for physical cards) */}
                {(cardTypes[item.id] || 'PHYSICAL') === 'PHYSICAL' && (
                  <div>
                    <Label htmlFor={`card-${item.id}`}>Physical Card Number</Label>
                    <input
                      id={`card-${item.id}`}
                      type="text"
                      placeholder="GC-XXXX-XXXX-XXXX"
                      value={cardNumbers[item.id] || ''}
                      onChange={(e) => handleCardNumberChange(item.id, e.target.value)}
                      className={`w-full p-2 border rounded-md ${errors[item.id] ? 'border-red-500' : 'border-gray-300'} dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                    />
                    {errors[item.id] && (
                      <p className="mt-1 text-sm text-red-600">{errors[item.id]}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      💡 Scan or enter from physical card
                    </p>
                  </div>
                )}

                {/* Digital Card Fields (only for digital cards) */}
                {cardTypes[item.id] === 'DIGITAL' && (
                  <>
                    <div>
                      <Label htmlFor={`email-${item.id}`}>Recipient Email *</Label>
                      <input
                        id={`email-${item.id}`}
                        type="email"
                        placeholder="recipient@example.com"
                        value={recipientEmails[item.id] || ''}
                        onChange={(e) => handleRecipientEmailChange(item.id, e.target.value)}
                        className={`w-full p-2 border rounded-md ${errors[`${item.id}_email`] ? 'border-red-500' : 'border-gray-300'} dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                      />
                      {errors[`${item.id}_email`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_email`]}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        📧 Gift card will be emailed to this address
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`name-${item.id}`}>Recipient Name (optional)</Label>
                      <input
                        id={`name-${item.id}`}
                        type="text"
                        placeholder="John Smith"
                        value={recipientNames[item.id] || ''}
                        onChange={(e) => handleRecipientNameChange(item.id, e.target.value)}
                        className="w-full p-2 border rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        👤 Optional: Name for personalization
                      </p>
                    </div>
                  </>
                )}

                {/* Custom Amount (if needed) */}
                {item.giftCardInfo.isCustomAmount && (
                  <div>
                    <Label htmlFor={`amount-${item.id}`}>
                      Amount ($25 - $300)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        id={`amount-${item.id}`}
                        type="number"
                        min="25"
                        max="300"
                        step="1"
                        placeholder="25"
                        className={`w-full pl-8 p-2 border rounded-md ${errors[`${item.id}_amount`] ? 'border-red-500' : 'border-gray-300'} dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                        value={customAmounts[item.id] || ''}
                        onChange={(e) => handleCustomAmountChange(item.id, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {errors[`${item.id}_amount`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_amount`]}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-stroke dark:border-strokedark">
          <button
            onClick={onClose}
            disabled={activating}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleActivateAll}
            disabled={activating}
            className="px-4 py-2 bg-[#597485] text-white rounded-md hover:bg-[#597485]/90 disabled:opacity-50"
          >
{activating ? 'Processing...' : 'Create Gift Cards'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftCardActivationModal;