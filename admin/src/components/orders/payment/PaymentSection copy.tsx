// src/components/orders/payment/PaymentSection.tsx
import React, { useState, useEffect } from 'react';
import PaymentCard from '../PaymentCard';
import PaymentModal from '../PaymentModal';
import GiftCardActivationModal from './GiftCardActivationModal';
import { orderContainsGiftCards, getGiftCardSummary } from '../../../utils/giftCardHelpers';

// Helper function to replace crypto.randomUUID
const generateId = () => {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

type Props = {
  customerState: any;
  orderState: any;
  itemTotal: number;
  gst: number;
  pst: number;
  grandTotal: number;
  employee: string;
  orderSource: "phone" | "walkin";
  cleanPhoneNumber: (value: string) => string;
  onOrderComplete: () => void;
  totalDeliveryFee: number;
  // Discount props
  couponDiscount: number;
  setCouponDiscount: (val: number) => void;
  manualDiscount: number;
  setManualDiscount: (val: number) => void;
  manualDiscountType: "$" | "%";
  setManualDiscountType: (val: "$" | "%") => void;
  giftCardDiscount: number;
  setGiftCardDiscount: (val: number) => void;
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
}) => {
  // Local state for payment form
  const [couponCode, setCouponCode] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Gift card state
  const [showGiftCardActivation, setShowGiftCardActivation] = useState(false);
  const [giftCardNumbers, setGiftCardNumbers] = useState<any[]>([]);
  const [pendingGiftCardRedemptions, setPendingGiftCardRedemptions] = useState<any[]>([]); // Store cards to redeem later

  // Check if current order has gift cards
  const currentOrder = orderState.orders[orderState.activeTab];
  const hasGiftCards = currentOrder ? orderContainsGiftCards(currentOrder.customProducts) : false;

  // ✅ Calculate amount after gift cards
  const amountAfterGiftCards = Math.max(0, grandTotal - giftCardDiscount);

  // ✅ NEW: Validation function for required fields
  const validateOrdersBeforePayment = (): string | null => {
    // Check customer
    if (!customerState.customer) {
      return "Please select a customer before processing payment.";
    }

    // Check employee
    if (!employee) {
      return "Please select an employee before processing payment.";
    }

    // Check each order
    for (let i = 0; i < orderState.orders.length; i++) {
      const order = orderState.orders[i];
      
      // Check recipient info for delivery
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

      // Check pickup person info for pickup
      if (order.orderType === 'PICKUP') {
        if (!order.recipientFirstName || !order.recipientLastName) {
          return `Order ${i + 1}: Pickup person name is required.`;
        }
      }

      // Check products
      const validProducts = order.customProducts.filter(p => 
        p.description && p.price && parseFloat(p.price) > 0
      );
      if (validProducts.length === 0) {
        return `Order ${i + 1}: At least one product with valid price is required.`;
      }
    }

    return null; // All valid
  };

  // Handle payment trigger
  const handleTriggerPayment = () => {
    // ✅ Validate before proceeding
    const validationError = validateOrdersBeforePayment();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    
    setFormError(null);
    
    if (hasGiftCards && giftCardNumbers.length === 0) {
      // Show gift card activation modal to GET CARD NUMBERS (not activate yet)
      setShowGiftCardActivation(true);
    } else if (amountAfterGiftCards > 0) {
      // Need payment for remaining amount
      setShowPaymentPopup(true);
    } else {
      // ✅ Full amount covered by gift cards - process order directly
      handlePaymentConfirm([]);
    }
  };

  // Handle gift card numbers collection
  const handleGiftCardNumbersCollected = (cardData: any[]) => {
    setGiftCardNumbers(cardData);
    setShowGiftCardActivation(false);
    
    console.log('🎁 Gift card data collected:', cardData);
    
    // Override product prices with gift card amounts
    if (cardData.length > 0) {
      const updatedOrders = [...orderState.orders];
      const currentOrderIndex = orderState.activeTab;
      
      // Group card data by itemId
      const cardsByItemId = cardData.reduce((acc, card) => {
        if (!acc[card.itemId]) acc[card.itemId] = [];
        acc[card.itemId].push(card);
        return acc;
      }, {});
      
      // Update product prices
      updatedOrders[currentOrderIndex].customProducts = updatedOrders[currentOrderIndex].customProducts.map((product, index) => {
        const stableId = `item-${index}-${product.description?.slice(0, 10) || 'gc'}`;
        
        if (cardsByItemId[stableId]) {
          const cardAmount = cardsByItemId[stableId][0].amount;
          console.log(`💰 Updating price: $${product.price} → $${cardAmount}`);
          
          return {
            ...product,
            price: cardAmount.toString()
          };
        }
        
        return product;
      });
      
      // Update the orders state
      orderState.setOrders(updatedOrders);
    }
    
    // ✅ After collecting gift card numbers, check if we need payment
    if (amountAfterGiftCards > 0) {
      setShowPaymentPopup(true);
    } else {
      // Full amount covered - process order directly
      handlePaymentConfirm([]);
    }
  };

  // ✅ UPDATED: Handle payment confirmation
  const handlePaymentConfirm = async (payments: any[]) => {
    // Allow empty payments if fully paid by gift cards
    if (!payments.length && amountAfterGiftCards > 0) {
      setFormError("No payments were entered.");
      return;
    }

    try {
      // Prepare order data
      const orderData = {
        customerId: customerState.customerId,
        orders: orderState.orders,
        paymentConfirmed: true,
        payments: payments.length > 0 ? payments : [{
          method: 'GIFT_CARD',
          amount: giftCardDiscount,
          details: { fullyPaidByGiftCard: true }
        }],
        employee,
        orderSource,
        subscribe,
        sendEmailReceipt,
        couponCode,
        discounts: {
          manual: manualDiscount,
          manualType: manualDiscountType,
          coupon: couponDiscount,
          giftCard: giftCardDiscount
        }
      };

      // STEP 1: Create the order FIRST
      console.log('📦 Creating order...', orderData);
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      
      if (!result.success) {
        setFormError(result.error || 'Failed to create orders');
        return;
      }

      console.log('✅ Orders created successfully:', result.orders);

      // STEP 2: Now process all gift card operations AFTER order is saved
      
      // 2a. Activate purchased gift cards
      if (giftCardNumbers.length > 0) {
        console.log('🎁 Activating purchased gift cards...');
        
        const { activateGiftCard } = await import('../../../services/giftCardService');
        
        for (const cardData of giftCardNumbers) {
          try {
            const result = await activateGiftCard(cardData.cardNumber, cardData.amount);
            console.log('✅ Activated card:', cardData.cardNumber);
          } catch (error: any) {
            console.error('❌ Failed to activate card:', cardData.cardNumber, error);
          }
        }
      }

      // 2b. Redeem gift cards used for payment
      if (pendingGiftCardRedemptions.length > 0) {
        console.log('💳 Redeeming gift cards used for payment...');
        
        const { redeemGiftCard } = await import('../../../services/giftCardService');
        
        for (const redemption of pendingGiftCardRedemptions) {
          try {
            await redeemGiftCard(redemption.cardNumber, redemption.amount);
            console.log('✅ Redeemed card:', redemption.cardNumber, 'for $', redemption.amount);
          } catch (error: any) {
            console.error('❌ Failed to redeem card:', redemption.cardNumber, error);
          }
        }
      }

      // Auto-save recipients
      for (const order of orderState.orders) {
        if (
          order.orderType === "DELIVERY" &&
          customerState.customerId &&
          order.recipientFirstName &&
          order.recipientAddress.address1
        ) {
          try {
            await fetch(`/api/customers/${customerState.customerId}/recipients`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName: order.recipientFirstName,
                lastName: order.recipientLastName,
                phone: cleanPhoneNumber(order.recipientPhone),
                address1: order.recipientAddress.address1,
                address2: order.recipientAddress.address2,
                city: order.recipientAddress.city,
                province: order.recipientAddress.province,
                postalCode: order.recipientAddress.postalCode,
                country: order.recipientAddress.country || "CA",
                company: order.recipientCompany,
              }),
            });
          } catch (error) {
            console.error("Failed to auto-save recipient:", error);
          }
        }
      }

      // Success!
      setShowPaymentPopup(false);
      alert("✅ All orders created successfully!");
      
      // Reset all state
      setCouponCode("");
      setGiftCardNumbers([]);
      setPendingGiftCardRedemptions([]);
      setFormError(null);
      
      // Call parent reset
      onOrderComplete();
      
    } catch (error) {
      console.error("Error creating orders:", error);
      setFormError("An error occurred while creating orders.");
    }
  };

  // ✅ Updated handler for gift card changes
  const handleGiftCardChange = (amount: number, cardData?: any) => {
    setGiftCardDiscount(amount);
    
    // Store redemption data for later use (after order creation)
    if (cardData && Array.isArray(cardData)) {
      setPendingGiftCardRedemptions(cardData);
      console.log('💳 Pending gift card redemptions:', cardData);
    } else if (amount === 0) {
      setPendingGiftCardRedemptions([]);
    }
  };

  return (
    <>
      <PaymentCard
        deliveryCharge={totalDeliveryFee}
        setDeliveryCharge={() => {}}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        discount={manualDiscount}
        setDiscount={setManualDiscount}
        discountType={manualDiscountType}
        setDiscountType={setManualDiscountType}
        itemTotal={itemTotal}
        gst={gst}
        pst={pst}
        grandTotal={grandTotal}
        subscribe={subscribe}
        setSubscribe={setSubscribe}
        sendEmailReceipt={sendEmailReceipt}
        setSendEmailReceipt={setSendEmailReceipt}
        onTriggerPayment={handleTriggerPayment}
        onCouponDiscountChange={setCouponDiscount}
        onGiftCardChange={handleGiftCardChange}
        customerId={customerState.customerId}
        source="WEBSITE"
        hasGiftCards={hasGiftCards}
      />

      {/* ✅ Display validation errors */}
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

      {/* Gift Card Numbers Collection Modal */}
      <GiftCardActivationModal
        open={showGiftCardActivation}
        onClose={() => setShowGiftCardActivation(false)}
        orderItems={currentOrder?.customProducts || []}
        onActivationComplete={handleGiftCardNumbersCollected}
      />

      {/* Payment Modal - only show if payment needed */}
<PaymentModal
  open={showPaymentPopup}
  onClose={() => setShowPaymentPopup(false)}
total={grandTotal}
  giftCardDiscount={giftCardDiscount}
  employee={employee}
  setFormError={setFormError}
  onConfirm={handlePaymentConfirm}
/>
    </>
  );
};

export default PaymentSection;