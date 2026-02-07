// src/components/orders/payment/PaymentSection.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TakeOrderPaymentTiles from './TakeOrderPaymentTiles';
import type { PaymentEntry } from '@domains/payments/hooks/usePaymentComposer';
import GiftCardHandoffModal from './GiftCardHandoffModal';
import { getGiftCardLineItems } from '@shared/utils/giftCardHelpers';
import { useOrderPayments } from '@domains/orders/hooks/useOrderPayments';
import { coerceCents } from '@shared/utils/currency';

// Simple success toast component that won't kick you out of fullscreen
const SuccessToast = ({ show, message, onClose }: { show: boolean; message: string; onClose: () => void }) => {
  if (!show) return null;
  
  return (
    <div className="fixed top-4 right-4 z-[100001] bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

type Props = {
  customerState: any;
  orderState: any;
  itemTotal: number;
  gst: number;
  pst: number;
  grandTotal: number;
  employee: string;
  orderSource: "phone" | "walkin" | "external" | "website" | "pos";
  cleanPhoneNumber: (value: string) => string;
  onOrderComplete: (transferData?: any) => void;
  totalDeliveryFee: number;
  couponDiscount: number;
  setCouponDiscount: (val: number) => void;
  manualDiscount: number;
  setManualDiscount: (val: number) => void;
  manualDiscountType: "$" | "%";
  setManualDiscountType: (val: "$" | "%") => void;
  giftCardDiscount: number;
  setGiftCardDiscount: (val: number) => void;
  isOverlay?: boolean;
  onAutomaticDiscountChange?: (amount: number, discounts: any[]) => void;
};

const PaymentSection: React.FC<Props> = ({
  customerState,
  orderState,
  itemTotal,
  gst,
  pst,
  grandTotal,
  employee,
  orderSource,
  cleanPhoneNumber,
  onOrderComplete,
  totalDeliveryFee,
  couponDiscount,
  setCouponDiscount,
  manualDiscount,
  setManualDiscount,
  manualDiscountType,
  setManualDiscountType,
  giftCardDiscount,
  setGiftCardDiscount,
  isOverlay = false,
  onAutomaticDiscountChange,
}) => {
  const [couponCode, setCouponCode] = useState("");
  const navigate = useNavigate();
  
  // MIGRATION: Use domain hook for payment operations
  const { 
    processing, 
    error: paymentError, 
    handlePOSTransfer, 
    completeOrderPayment 
  } = useOrderPayments();
  
  const [subscribe, setSubscribe] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [sendSMSReceipt, setSendSMSReceipt] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(false);
  const [printTicket, setPrintTicket] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGiftCardHandoff, setShowGiftCardHandoff] = useState(false);
  const [activatedGiftCards, setActivatedGiftCards] = useState<any[]>([]);
  const [pendingGiftCardRedemptions, setPendingGiftCardRedemptions] = useState<any[]>([]);
  const [automaticDiscounts, setAutomaticDiscounts] = useState<any[]>([]);
  const [automaticDiscountAmount, setAutomaticDiscountAmount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const amountAfterGiftCards = Math.max(0, grandTotal - giftCardDiscount);

  // Function to check for automatic discounts
  const checkAutomaticDiscounts = async () => {
    if (!orderState.orders.length) return;

    try {
      // Build cart items from all orders
      const cartItems = [];
      for (const order of orderState.orders) {
        for (const product of order.customProducts) {
          if (product.description && product.price && parseFloat(product.price) > 0) {
            cartItems.push({
              id: product.productId || product.id || `temp-${Date.now()}`,
              categoryId: product.category || '',
              categoryIds: product.categoryIds || (product.category ? [product.category] : []),
              quantity: parseInt(product.qty) || 1,
              price: coerceCents(product.price || "0")
            });
          }
        }
      }

      if (cartItems.length === 0) {
        setAutomaticDiscounts([]);
        setAutomaticDiscountAmount(0);
        return;
      }

      console.log('🔍 Checking for automatic discounts...', { 
        cartItems,
        orderCount: orderState.orders.length,
        customerState: customerState.customerId
      });

      const response = await fetch('/api/discounts/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          customerId: customerState.customerId,
          source: 'WEBSITE'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Automatic discounts found:', result);
        
        if (result.discounts && result.discounts.length > 0) {
          setAutomaticDiscounts(result.discounts);
          const totalAutoDiscount = result.discounts.reduce((sum: number, discount: any) => 
            sum + (discount.discountAmount || 0), 0
          );
          setAutomaticDiscountAmount(totalAutoDiscount);
          onAutomaticDiscountChange?.(totalAutoDiscount, result.discounts);
        } else {
          setAutomaticDiscounts([]);
          setAutomaticDiscountAmount(0);
          onAutomaticDiscountChange?.(0, []);
        }
      } else {
        console.error('Failed to check automatic discounts');
        setAutomaticDiscounts([]);
        setAutomaticDiscountAmount(0);
        onAutomaticDiscountChange?.(0, []);
      }
    } catch (error) {
      console.error('Error checking automatic discounts:', error);
      setAutomaticDiscounts([]);
      setAutomaticDiscountAmount(0);
      onAutomaticDiscountChange?.(0, []);
    }
  };

  // Check for automatic discounts when orders change
  useEffect(() => {
    checkAutomaticDiscounts();
  }, [orderState.orders, customerState.customerId]);

  const validateOrdersBeforePayment = (): string | null => {
    if (!customerState.customer) {
      return "Please select a customer before processing payment.";
    }
    if (!employee) {
      return "Please select an employee before processing payment.";
    }
    for (let i = 0; i < orderState.orders.length; i++) {
      const order = orderState.orders[i];
      if (order.orderType === 'DELIVERY') {
        if (!order.recipientFirstName || !order.recipientLastName) {
          return `Order ${i + 1}: Recipient name is required for delivery.`;
        }
        if (!order.recipientAddress.address1 || !order.recipientAddress.city || !order.recipientAddress.province) {
          return `Order ${i + 1}: Complete delivery address is required.`;
        }
        if (!order.deliveryDate) {
          return `Order ${i + 1}: Delivery date is required.`;
        }
      }
      if (order.orderType === 'PICKUP') {
        if (!order.recipientFirstName || !order.recipientLastName) {
          return `Order ${i + 1}: Pickup person name is required.`;
        }
      }
      const validProducts = order.customProducts.filter(
        (p: any) => p.description && p.price && coerceCents(p.price) > 0
      );
      if (validProducts.length === 0) {
        return `Order ${i + 1}: At least one product with valid price is required.`;
      }
    }
    return null;
  };

  const handlePaymentConfirm = async (payments: PaymentEntry[]) => {
    // Check if this is a "Send to POS" payment
    const posTransferPayment = payments.find(p => p.method === 'send_to_pos');

    // For Send to POS, validate orders before processing
    if (posTransferPayment) {
      const validationError = validateOrdersBeforePayment();
      if (validationError) {
        setFormError(validationError);
        return;
      }
    }

    if (!payments.length && amountAfterGiftCards > 0 && !posTransferPayment) {
      setFormError("No payments were entered.");
      return;
    }

    const manualDiscountAmountCents =
      manualDiscountType === "%"
        ? Math.round(((itemTotal + totalDeliveryFee) * manualDiscount) / 100)
        : manualDiscount;
    const totalDiscountCents =
      manualDiscountAmountCents +
      couponDiscount +
      giftCardDiscount +
      automaticDiscountAmount;

    if (posTransferPayment) {
      // Prevent multiple submissions
      if (processing) {
        console.log('⏳ POS transfer already in progress...');
        return;
      }
      
      // MIGRATION: Handle Send to POS using domain hook
      console.log('📤 Saving as draft and transferring to POS...');
      
      try {
        const totals = {
          itemTotal,
          deliveryFee: totalDeliveryFee,
          discount: totalDiscountCents,
          gst,
          pst,
          grandTotal
        };
        
        const transferData = await handlePOSTransfer(
          customerState,
          orderState,
          totals,
          employee,
          cleanPhoneNumber
        );
        
        // Use existing callback mechanism with transfer data!
        console.log('✅ Transferring to POS via callback...');
        onOrderComplete(transferData); // Pass transfer data directly to TakeOrderPage
        return;

      } catch (error) {
        console.error("Error creating draft orders:", error);
        setFormError(paymentError || "Failed to create draft orders for POS transfer.");
        return;
      }
    }

    // MIGRATION: Handle regular payment completion using domain hook
    try {
      const paymentsData = payments.length > 0 ? payments : [{
        method: 'GIFT_CARD',
        amount: giftCardDiscount,
        notes: 'Gift card payment'
      }];

      const totals = {
        itemTotal,
        deliveryFee: totalDeliveryFee,
        discount: totalDiscountCents,
        gst,
        pst,
        grandTotal
      };

      const result = await completeOrderPayment(
        customerState,
        orderState,
        paymentsData,
        totals,
        employee,
        orderSource,
        cleanPhoneNumber
      );

      if (!result.success) {
        setFormError(result.error || 'Failed to create orders');
        return;
      }

      console.log('✅ Orders created successfully:', result.orders);

      // Create order data object for transaction tracking
      const orderData: any = {
        orders: result.orders
      };

      // 💰 Create PT-XXXX payment transaction for all non-POS payments
      if (payments.length > 0 || giftCardDiscount > 0) {
        try {
          console.log('💳 Creating PT-XXXX payment transaction...');
          
          // Map payment methods to PT transaction format
          const paymentMethods = [];
          
          // Add regular payment methods
          for (const payment of payments) {
            const mappedMethod = mapTakeOrderPaymentToAPI(payment);
            if (mappedMethod) {
              paymentMethods.push(mappedMethod);
            }
          }
          
          // Add gift card payment if present
          if (giftCardDiscount > 0 && !payments.some(p => p.method === 'gift_card')) {
            paymentMethods.push({
              type: 'GIFT_CARD',
              provider: 'INTERNAL',
              amount: giftCardDiscount
            });
          }

          if (paymentMethods.length > 0) {
            const paymentMethodsTotal = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
            const employeeId = employee; // Should be employee ID, not name
            // Get customer ID from the created orders (they always have the customer ID)
            const currentCustomerId = result.orders[0]?.customerId;

            console.log('💳 PT Transaction - Customer ID:', currentCustomerId);

            if (!currentCustomerId) {
              console.error('❌ No customer ID found in created orders');
              throw new Error('Customer ID missing from orders');
            }

            const transactionResponse = await fetch('/api/payment-transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: currentCustomerId,
                employeeId: employeeId,
                channel: 'PHONE',
                totalAmount: paymentMethodsTotal,
                taxAmount: gst + pst,
                tipAmount: 0,
                notes: `Phone order from ${customerState.customerName || 'customer'}`,
                paymentMethods: paymentMethods,
                orderIds: result.orders.map((order: any) => order.id)
              }),
            });

            if (transactionResponse.ok) {
              const transaction = await transactionResponse.json();
              console.log('✅ PT transaction created:', transaction.transactionNumber);
              
              // You could store the transaction number for display/receipt purposes
              orderData.transactionNumber = transaction.transactionNumber;
            } else {
              const error = await transactionResponse.json();
              console.error('❌ Failed to create PT transaction:', error);
              // Continue with order completion even if PT transaction fails
              setFormError(`Orders created but payment tracking failed: ${error.error}`);
            }
          }
        } catch (error) {
          console.error('❌ PT transaction creation failed:', error);
          // Continue with order completion even if PT transaction fails
        }
      }

      // 🎁 Create/activate gift cards if any were purchased
      const giftCardOrders = orderState.orders
        .map((order: any, index: number) => ({
          orderId: result.orders?.[index]?.id,
          cards: getGiftCardLineItems(order.customProducts || []),
        }))
        .filter((entry: any) => entry.cards.length > 0);

      if (giftCardOrders.length > 0) {
        console.log('🎁 Creating/activating gift cards...');
        const { purchaseGiftCards } = await import('@shared/legacy-services/giftCardService');
        const purchasedCards: any[] = [];
        const fallbackRecipientName = `${customerState.customer?.firstName || ''} ${customerState.customer?.lastName || ''}`.trim() || undefined;

        try {
          for (const entry of giftCardOrders) {
            const cardsToProcess = entry.cards.map((card: any) => ({
              cardNumber: card.cardNumber,
              amount: card.amount,
              type: card.type || 'PHYSICAL',
              recipientName: card.recipientName || fallbackRecipientName,
              recipientEmail: card.recipientEmail,
              message: card.message,
            }));

            const purchaseResult = await purchaseGiftCards(
              cardsToProcess,
              customerState.customer?.id,
              employee,
              entry.orderId
            );

            if (Array.isArray(purchaseResult?.cards)) {
              purchasedCards.push(...purchaseResult.cards);
            }
          }

          if (purchasedCards.length > 0) {
            console.log('✅ Gift cards created/activated:', purchasedCards);
            setActivatedGiftCards(purchasedCards);
            setShowGiftCardHandoff(true);
          }
        } catch (error: any) {
          console.error('❌ Failed to create/activate gift cards:', error);
          setFormError(`Orders created but gift card activation failed: ${error.message}`);
        }
      }

      if (pendingGiftCardRedemptions.length > 0) {
        console.log('💳 Redeeming gift cards...');
        const { redeemGiftCard } = await import('@shared/legacy-services/giftCardService');
        for (const { cardNumber, amount } of pendingGiftCardRedemptions) {
          try {
            await redeemGiftCard(cardNumber, amount);
            console.log('✅ Redeemed card:', cardNumber, 'for $', amount);
          } catch (error: any) {
            console.error('❌ Failed to redeem card:', cardNumber);
          }
        }
      }

      // Recipients are now created/updated before order creation above
      // No need for post-order recipient creation

      // 📧📱 Send receipt notifications if requested
      if ((sendEmailReceipt || sendSMSReceipt) && orderData.transactionNumber) {
        const customerName = customerState.customer?.firstName + ' ' + customerState.customer?.lastName;
        const shouldSendEmail = sendEmailReceipt && customerState.customer?.email;
        const shouldSendSMS = sendSMSReceipt && customerState.customer?.phone;
        
        if (shouldSendEmail || shouldSendSMS) {
          console.log('📧📱 Sending receipt notifications...', { email: shouldSendEmail, sms: shouldSendSMS });
          try {
            const receiptResponse = await fetch('/api/email/receipt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerEmail: customerState.customer?.email,
                customerPhone: customerState.customer?.phone,
                customerName,
                transactionNumber: orderData.transactionNumber,
                orderNumbers: result.orders.map((order: any) => order.id),
                totalAmount: grandTotal,
                paymentMethods: payments.map(p => ({
                  type: p.method,
                  amount: p.amount
                })),
                orderDetails: result.orders,
                sendEmail: shouldSendEmail,
                sendSMS: shouldSendSMS
              })
            });

            if (receiptResponse.ok) {
              console.log('✅ Receipt notifications sent successfully');
            } else {
              console.log('❌ Failed to send receipt notifications');
            }
          } catch (error) {
            console.error('❌ Error sending receipt notifications:', error);
            // Don't fail the order if receipt notifications fail
          }
        }
      }

      setShowSuccessToast(true);
      setCouponCode("");
      setPendingGiftCardRedemptions([]);
      setFormError(null);
      
      // Auto-hide toast after 3 seconds, then redirect to order view
      setTimeout(() => {
        setShowSuccessToast(false);
        
        // Redirect to the first created order's view page
        if (result.orders && result.orders.length > 0) {
          const firstOrderId = result.orders[0].id;
          navigate(`/orders/${firstOrderId}`);
        }
      }, 3000);
      
      onOrderComplete();
      
    } catch (error) {
      console.error("Error creating orders:", error);
      setFormError("An error occurred while creating orders.");
    }
  };

  const handleGiftCardChange = (amount: number, cardData?: any) => {
    setGiftCardDiscount(amount);
    if (cardData && Array.isArray(cardData)) {
      setPendingGiftCardRedemptions(cardData);
      console.log('💳 Pending gift card redemptions:', cardData);
    } else if (amount === 0) {
      setPendingGiftCardRedemptions([]);
    }
  };

  return (
    <>
      <TakeOrderPaymentTiles
        total={grandTotal}
        itemTotal={itemTotal}
        gst={gst}
        pst={pst}
        grandTotal={grandTotal}
        totalDeliveryFee={totalDeliveryFee}
        customer={customerState.customer}
        onComplete={(paymentData) => {
          const validationError = validateOrdersBeforePayment();
          if (validationError) {
            setFormError(validationError);
            return;
          }

          const normalizedPayments = normalizeTakeOrderPayments(paymentData);
          if (!normalizedPayments.length) {
            setFormError('No payments were entered.');
            return;
          }

          handlePaymentConfirm(normalizedPayments);
        }}
        onDiscountsChange={(discounts) => {
          if (discounts.manualDiscount !== undefined) {
            setManualDiscount(discounts.manualDiscount);
          }
          if (discounts.manualDiscountType !== undefined) {
            setManualDiscountType(discounts.manualDiscountType);
          }
        }}
        onGiftCardChange={handleGiftCardChange}
        couponDiscount={couponDiscount}
        giftCardDiscount={giftCardDiscount}
        manualDiscount={manualDiscount}
        manualDiscountType={manualDiscountType}
        isOverlay={isOverlay}
      />

      {formError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 dark:text-red-200 text-sm font-medium">{formError}</span>
          </div>
        </div>
      )}
      <GiftCardHandoffModal
        open={showGiftCardHandoff}
        onClose={() => {
          setShowGiftCardHandoff(false);
          setActivatedGiftCards([]);
          onOrderComplete(); // Complete the order flow after gift card handoff
        }}
        cards={activatedGiftCards}
        customerName={customerState.customer?.firstName + ' ' + customerState.customer?.lastName}
        isDigital={activatedGiftCards.some(card => card.type === 'DIGITAL')}
      />
      
      {/* Success Toast - won't kick you out of fullscreen */}
      <SuccessToast 
        show={showSuccessToast}
        message="✅ All orders created successfully!"
        onClose={() => setShowSuccessToast(false)}
      />
    </>
  );
};

const normalizeTakeOrderPayments = (paymentData: any): PaymentEntry[] => {
  if (!paymentData) return [];

  if (paymentData.method === 'send_to_pos') {
    return [paymentData];
  }

  if (paymentData.method === 'SPLIT' && Array.isArray(paymentData.metadata?.payments)) {
    return paymentData.metadata.payments.map((payment: any) =>
      normalizeSinglePayment(payment)
    );
  }

  return [normalizeSinglePayment(paymentData)];
};

const normalizeSinglePayment = (payment: any): PaymentEntry => {
  const rawMethod = String(payment.method || '').toUpperCase();

  if (rawMethod === 'CARD' || rawMethod === 'CARD_STRIPE') {
    return {
      method: 'credit',
      amount: payment.amount,
      metadata: {
        ...payment.metadata,
        provider: payment.metadata?.provider || 'stripe',
      },
    };
  }

  if (rawMethod === 'CASH') {
    return {
      method: 'cash',
      amount: payment.amount,
      metadata: payment.metadata,
    };
  }

  if (rawMethod === 'HOUSE_ACCOUNT') {
    return {
      method: 'house_account',
      amount: payment.amount,
      metadata: payment.metadata,
    };
  }

  if (rawMethod === 'COD') {
    return {
      method: 'cod',
      amount: payment.amount,
      metadata: payment.metadata,
    };
  }

  if (rawMethod === 'CHECK') {
    return {
      method: 'check',
      amount: payment.amount,
      metadata: payment.metadata,
    };
  }

  return {
    method: payment.method || 'cash',
    amount: payment.amount,
    metadata: payment.metadata,
  };
};

// Helper function to map TakeOrder payment methods to PT transaction API format
const mapTakeOrderPaymentToAPI = (payment: any) => {
  const baseMethod = {
    type: mapPaymentMethodType(payment.method),
    provider: payment.metadata?.provider?.toUpperCase?.() || getPaymentProvider(payment.method),
    amount: payment.amount
  };

  // Add method-specific data based on payment type
  switch (payment.method) {
    case 'credit':
    case 'debit':
      return {
        ...baseMethod,
        providerTransactionId: payment.metadata?.transactionId,
        cardLast4: payment.metadata?.cardLast4,
        cardBrand: payment.metadata?.cardBrand
      };
    case 'gift_card':
      return {
        ...baseMethod,
        giftCardNumber: payment.metadata?.cardNumber
      };
    case 'check':
      return {
        ...baseMethod,
        checkNumber: payment.metadata?.checkNumber || payment.metadata?.reference,
        providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined
      };
    case 'house_account':
      return {
        ...baseMethod,
        providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined
      };
    case 'cod':
      return {
        ...baseMethod,
        providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined
      };
    default:
      if (payment.method.startsWith('offline:')) {
        return {
          ...baseMethod,
          offlineMethodId: payment.metadata?.offlineMethodId,
          providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined
        };
      };
      return {
        ...baseMethod,
        providerMetadata: payment.metadata?.reference ? { reference: payment.metadata.reference } : undefined
      };
  }
};

// Helper function to map payment method names to API enum values
const mapPaymentMethodType = (method: string): string => {
  const methodMap: Record<string, string> = {
    'cash': 'CASH',
    'credit': 'CARD',
    'debit': 'CARD',
    'gift_card': 'GIFT_CARD',
    'store_credit': 'STORE_CREDIT',
    'check': 'CHECK',
    'cod': 'COD',
    'house_account': 'HOUSE_ACCOUNT'
  };
  
  if (method.startsWith('offline:') || method === 'wire') {
    return 'OFFLINE';
  }

  return methodMap[method] || 'CASH';
};

// Helper function to determine payment provider based on method and channel
const getPaymentProvider = (method: string): string => {
  // TakeOrder (phone) channel uses Square for card payments, internal for everything else
  if (method === 'credit' || method === 'debit') {
    return 'SQUARE'; // Phone orders use Square for card payments
  }
  return 'INTERNAL'; // Cash, gift cards, checks, COD, house accounts use internal processing
};

export default PaymentSection;
