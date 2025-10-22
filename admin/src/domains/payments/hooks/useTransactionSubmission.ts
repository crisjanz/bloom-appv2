/**
 * Transaction Submission Hook
 *
 * Handles payment transaction processing:
 * - Payment normalization and validation
 * - Transaction API submission
 * - Gift card activation integration
 * - Customer creation (using shared guest customer)
 */

import { useState, useCallback } from 'react';
import { mapPaymentMethodType, getPaymentProvider, normalizePayments } from '@shared/utils/paymentHelpers';
import { getOrCreateGuestCustomer } from '@shared/utils/customerHelpers';
import { CompletionData } from './usePaymentState';

export type PaymentPayload = {
  method: string;
  amount: number;
  metadata?: Record<string, any>;
};

export type GiftCardData = {
  cardNumber: string;
  amount: number;
  type?: string;
  recipientName?: string;
  recipientEmail?: string;
};

export type GiftCardRedemption = {
  cardNumber: string;
  amount: number;
};

const MIN_BALANCE = 0.01;

export const useTransactionSubmission = () => {
  const [pendingFinalization, setPendingFinalization] = useState<PaymentPayload[] | null>(null);
  const [giftCardNumbers, setGiftCardNumbers] = useState<GiftCardData[]>([]);
  const [activatedGiftCards, setActivatedGiftCards] = useState<any[]>([]);

  /**
   * Submit payment transaction to API
   */
  const submitTransaction = useCallback(async ({
    payments,
    total,
    customer,
    customerDisplayName,
    employeeId,
    taxAmount = 0,
    tipAmount = 0,
    orderIds = [],
    cartItems = [],
    giftCardRedemptions = [],
    hasGiftCards = false,
  }: {
    payments: PaymentPayload[];
    total: number;
    customer?: any;
    customerDisplayName?: string;
    employeeId?: string;
    taxAmount?: number;
    tipAmount?: number;
    orderIds?: string[];
    cartItems?: any[];
    giftCardRedemptions?: GiftCardRedemption[];
    hasGiftCards?: boolean;
  }): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      // Get or create customer ID
      let customerId = customer?.id;
      if (!customerId) {
        customerId = await getOrCreateGuestCustomer();
      }

      // Extract draft order IDs from cart items
      const draftOrderIds = cartItems
        .filter((item) => item.draftOrderId)
        .map((item) => item.draftOrderId);

      // Get non-draft cart items that need to be converted to orders
      const nonDraftItems = cartItems.filter((item) => !item.draftOrderId);

      // Collect all order IDs (draft + newly created)
      let allOrderIds = [...draftOrderIds];

      // Create orders for non-draft cart items if any
      if (nonDraftItems.length > 0) {
        console.log('📦 Creating POS orders from cart items...', { count: nonDraftItems.length });

        // Convert cart items to order format
        const orderData = {
          customerId,
          orders: [{
            orderType: 'PICKUP', // POS grid items are PICKUP by default
            deliveryFee: 0,
            cardMessage: '',
            deliveryInstructions: `POS transaction for ${customerDisplayName || 'Walk-in Customer'}`,
            deliveryDate: null,
            deliveryTime: null,
            customProducts: nonDraftItems.map((item) => ({
              description: item.name || item.customName || 'POS Item', // Backend expects 'description'
              price: String(item.customPrice ?? item.price ?? 0),
              qty: String(item.quantity ?? 1),
              tax: item.isTaxable ?? true, // Include taxability
            })),
          }],
          paymentConfirmed: true,
          employee: employeeId,
          orderSource: 'POS',
        };

        const orderResponse = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          throw new Error(errorData.error || 'Failed to create POS orders');
        }

        const orderResult = await orderResponse.json();
        if (!orderResult.success || !orderResult.orders) {
          throw new Error('Failed to create POS orders');
        }

        // Add newly created order IDs
        const newOrderIds = orderResult.orders.map((order: any) => order.id);
        allOrderIds = [...allOrderIds, ...newOrderIds];
        console.log('✅ Created POS orders:', newOrderIds);
      }

      // Update draft orders to PAID status
      if (draftOrderIds.length > 0) {
        console.log('📝 Updating draft orders to PAID status...', { count: draftOrderIds.length });
        for (const draftId of draftOrderIds) {
          try {
            // Fetch the draft order to get its calculated total
            const orderResponse = await fetch(`/api/orders/${draftId}`);
            if (!orderResponse.ok) {
              console.error(`❌ Failed to fetch draft order ${draftId}`);
              continue;
            }

            const orderData = await orderResponse.json();
            const order = orderData.order || orderData;

            // Calculate order total from its items, fees, and taxes
            const itemsSubtotal = order.orderItems?.reduce((sum: number, item: any) =>
              sum + (item.rowTotal || item.unitPrice * item.quantity), 0) || 0;
            const calculatedTotal = itemsSubtotal + (order.deliveryFee || 0) + (order.totalTax || 0) - (order.discount || 0);

            console.log(`📊 Draft order ${draftId} calculated total: $${(calculatedTotal / 100).toFixed(2)}`);

            const updateResponse = await fetch(`/api/orders/${draftId}/update`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'PAID',
                paymentAmount: calculatedTotal, // Use the order's calculated total
                employeeId,
              }),
            });

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json().catch(() => ({}));
              console.error(`❌ Failed to update draft order ${draftId}:`, errorData);
            } else {
              console.log(`✅ Updated draft order ${draftId} to PAID with paymentAmount: $${(calculatedTotal / 100).toFixed(2)}`);
            }
          } catch (error) {
            console.error(`❌ Error updating draft order ${draftId}:`, error);
          }
        }
      }

      // Validate we have order IDs before creating PT transaction
      if (allOrderIds.length === 0) {
        console.error('❌ Cannot create PT transaction: No order IDs collected!');
        throw new Error('No orders were created or found. Cannot process payment.');
      }

      console.log('💳 Creating PT transaction with order IDs:', allOrderIds);
      console.log('📊 Payment details:', {
        total: payments.reduce((sum, payment) => sum + payment.amount, 0),
        taxAmount,
        tipAmount,
        orderCount: allOrderIds.length,
      });

      // Transform payments for API
      const apiPayments = payments.map((payment) => {
        const base = {
          type: mapPaymentMethodType(payment.method),
          provider: getPaymentProvider(payment.method, payment.metadata?.provider),
          amount: Number(payment.amount.toFixed(2)),
        };

        if (payment.method === 'credit') {
          return {
            ...base,
            providerTransactionId: payment.metadata?.transactionId,
            paymentIntentId: payment.metadata?.paymentIntentId,
            cardLast4: payment.metadata?.cardLast4,
            cardBrand: payment.metadata?.cardBrand,
          };
        }

        if (payment.method === 'cash') {
          return {
            ...base,
            providerMetadata:
              typeof payment.metadata?.cashReceived === 'number'
                ? {
                    cashReceived: payment.metadata.cashReceived,
                    changeDue: payment.metadata?.changeDue ?? 0,
                  }
                : undefined,
          };
        }

        if (payment.method === 'check') {
          return {
            ...base,
            checkNumber: payment.metadata?.reference,
            providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined,
          };
        }

        if (payment.method === 'house_account' || payment.method === 'cod') {
          return {
            ...base,
            providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined,
          };
        }

        if (payment.method.startsWith('offline:')) {
          return {
            ...base,
            offlineMethodId: payment.metadata?.offlineMethodId,
            providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined,
          };
        }

        return base;
      });

      // Submit transaction
      const transactionResponse = await fetch('/api/payment-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          employeeId,
          channel: 'POS',
          totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
          taxAmount,
          tipAmount,
          notes: `POS transaction for ${customerDisplayName || 'Walk-in Customer'}`,
          paymentMethods: apiPayments,
          orderIds: allOrderIds, // Use collected order IDs (draft + newly created)
        }),
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      const transaction = await transactionResponse.json();
      console.log('✅ PT transaction created successfully:', {
        transactionNumber: transaction.transactionNumber,
        transactionId: transaction.id,
        linkedOrders: allOrderIds.length,
        totalAmount: transaction.totalAmount,
      });

      // Handle gift card activation
      if (giftCardNumbers.length > 0) {
        const { purchaseGiftCards } = await import('@shared/legacy-services/giftCardService');
        const cards = giftCardNumbers.map((card) => ({
          cardNumber: card.cardNumber,
          amount: card.amount,
          type: card.type || 'PHYSICAL',
          recipientName: card.recipientName || customerDisplayName || 'Walk-in Customer',
          recipientEmail: card.recipientEmail,
        }));

        try {
          const purchaseResult = await purchaseGiftCards(cards, customerId, employeeId, transaction.id);
          setActivatedGiftCards(purchaseResult.cards);
        } catch (giftError: any) {
          return {
            success: false,
            error: `Payment completed, but gift card activation failed: ${giftError.message}`,
          };
        }
      }

      // Handle gift card redemptions
      if (giftCardRedemptions.length > 0) {
        const { redeemGiftCard } = await import('@shared/legacy-services/giftCardService');
        for (const redemption of giftCardRedemptions) {
          try {
            await redeemGiftCard(redemption.cardNumber, redemption.amount, transaction.id, employeeId);
          } catch (redeemError) {
            console.error('Failed to redeem gift card', redeemError);
          }
        }
      }

      return {
        success: true,
        data: {
          transaction,
          activatedGiftCards: activatedGiftCards,
        },
      };
    } catch (processingError) {
      console.error('Payment processing failed:', processingError);
      return {
        success: false,
        error: processingError instanceof Error ? processingError.message : 'Payment processing failed',
      };
    }
  }, [activatedGiftCards, giftCardNumbers]);

  /**
   * Validate and attempt to finalize payments
   */
  const attemptFinalize = useCallback((
    payments: PaymentPayload[],
    total: number,
    hasGiftCards: boolean,
    onNeedGiftCardActivation: () => void,
    onSubmit: (normalized: PaymentPayload[]) => void,
  ) => {
    const normalized = normalizePayments(payments, total, MIN_BALANCE);
    const coverage = normalized.reduce((sum, payment) => sum + payment.amount, 0);

    if (Math.abs(coverage - total) > 1) {
      throw new Error('Payments do not cover the order total.');
    }

    // Check if gift card activation is needed
    if (hasGiftCards && giftCardNumbers.length === 0) {
      setPendingFinalization(normalized);
      onNeedGiftCardActivation();
      return;
    }

    onSubmit(normalized);
  }, [giftCardNumbers.length]);

  /**
   * Handle gift card activation completion
   */
  const handleGiftCardActivationComplete = useCallback((cards: GiftCardData[], onContinue: (payments: PaymentPayload[]) => void) => {
    setGiftCardNumbers(cards);
    if (pendingFinalization) {
      onContinue(pendingFinalization);
    }
  }, [pendingFinalization]);

  const resetTransaction = useCallback(() => {
    setPendingFinalization(null);
    setGiftCardNumbers([]);
    setActivatedGiftCards([]);
  }, []);

  return {
    // State
    pendingFinalization,
    giftCardNumbers,
    activatedGiftCards,

    // Actions
    submitTransaction,
    attemptFinalize,
    handleGiftCardActivationComplete,
    setGiftCardNumbers,
    setActivatedGiftCards,
    setPendingFinalization,
    resetTransaction,
  };
};
