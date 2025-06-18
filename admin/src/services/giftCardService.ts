import type { GiftCard, GiftCardCheckResult, GiftCardRedeemResult } from '../types/giftCard';

const API_BASE_URL = '/api/gift-cards'; // Using your Vite proxy

export const checkGiftCardBalance = async (cardNumber: string): Promise<GiftCardCheckResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking gift card:', error);
    return { valid: false, error: 'Network error' };
  }
};

export const redeemGiftCard = async (
  cardNumber: string, 
  amount: number, 
  orderId?: string,
  employeeId?: string
): Promise<GiftCardRedeemResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber, amount, orderId, employeeId })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error redeeming gift card:', error);
    return { success: false, error: 'Network error' };
  }
};

export const activateGiftCard = async (
  cardNumber: string,
  amount: number,
  purchasedBy?: string,
  employeeId?: string,
  orderId?: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber, amount, purchasedBy, employeeId, orderId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to activate gift card');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error activating gift card:', error);
    throw error;
  }
};

export const purchaseGiftCards = async (
  cards: Array<{
    cardNumber?: string;
    amount: number;
    type: 'PHYSICAL' | 'DIGITAL';
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
  }>,
  purchasedBy?: string,
  employeeId?: string,
  orderId?: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards, purchasedBy, employeeId, orderId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to purchase gift cards');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error purchasing gift cards:', error);
    throw error;
  }
};

export const fetchGiftCards = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}`);
    if (!response.ok) {
      throw new Error('Failed to fetch gift cards');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    throw error;
  }
};