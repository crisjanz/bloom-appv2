import { useState, useCallback } from 'react';
import { checkGiftCardBalance, redeemGiftCard } from '../services/giftCardService';
import type { GiftCardCheckResult } from '../types/giftCard';

export const useGiftCard = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [cardData, setCardData] = useState<GiftCardCheckResult | null>(null);

  const checkBalance = useCallback(async (cardNumber: string) => {
    if (!cardNumber.trim()) {
      setCardData(null);
      return null;
    }

    setIsChecking(true);
    try {
      const result = await checkGiftCardBalance(cardNumber);
      setCardData(result);
      return result;
    } catch (error) {
      const errorResult = { valid: false, error: 'Failed to check card' };
      setCardData(errorResult);
      return errorResult;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const redeemCard = useCallback(async (
    cardNumber: string, 
    amount: number,
    orderId?: string,
    employeeId?: string
  ) => {
    setIsRedeeming(true);
    try {
      const result = await redeemGiftCard(cardNumber, amount, orderId, employeeId);
      
      // Update local card data if redemption successful
      if (result.success && cardData?.valid) {
        setCardData({
          ...cardData,
          balance: result.remainingBalance || 0
        });
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to redeem gift card' };
    } finally {
      setIsRedeeming(false);
    }
  }, [cardData]);

  const clearCard = useCallback(() => {
    setCardData(null);
  }, []);

  return {
    checkBalance,
    redeemCard,
    clearCard,
    isChecking,
    isRedeeming,
    cardData,
    isValid: cardData?.valid || false,
    balance: cardData?.balance || 0,
    errorMessage: cardData?.error
  };
};