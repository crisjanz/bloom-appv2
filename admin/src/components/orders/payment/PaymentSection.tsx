// src/components/orders/payment/PaymentSection.tsx
import React, { useState } from 'react';
import PaymentCard from '../PaymentCard';
import PaymentModal from '../PaymentModal';
import GiftCardActivationModal from './GiftCardActivationModal';
import { orderContainsGiftCards } from '../../../utils/giftCardHelpers';

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
  const [couponCode, setCouponCode] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGiftCardActivation, setShowGiftCardActivation] = useState(false);
  const [giftCardNumbers, setGiftCardNumbers] = useState<any[]>([]);
  const [pendingGiftCardRedemptions, setPendingGiftCardRedemptions] = useState<any[]>([]);

  const currentOrder = orderState.orders[orderState.activeTab];
  const hasGiftCards = currentOrder ? orderContainsGiftCards(currentOrder.customProducts) : false;
  const amountAfterGiftCards = Math.max(0, grandTotal - giftCardDiscount);

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
      const validProducts = order.customProducts.filter(p => 
        p.description && p.price && parseFloat(p.price) > 0
      );
      if (validProducts.length === 0) {
        return `Order ${i + 1}: At least one product with valid price is required.`;
      }
    }
    return null;
  };

  const handleTriggerPayment = () => {
    const validationError = validateOrdersBeforePayment();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    
    setFormError(null);
    
    if (hasGiftCards && giftCardNumbers.length === 0) {
      setShowGiftCardActivation(true);
    } else {
      setShowPaymentPopup(true);
    }
  };

  const handleGiftCardNumbersCollected = (cardData: any[]) => {
    setGiftCardNumbers(cardData);
    setShowGiftCardActivation(false);
    
    console.log('🎁 Gift card data collected:', cardData);
    
    if (cardData.length > 0) {
      const updatedOrders = [...orderState.orders];
      const currentOrderIndex = orderState.activeTab;
      
      const cardsByItemId = cardData.reduce((acc, card) => {
        if (!acc[card.itemId]) acc[card.itemId] = [];
        acc[card.itemId].push(card);
        return acc;
      }, {});
      
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
      
      orderState.setOrders(updatedOrders);
    }
    
    // Rely on user clicking "Complete Order" to trigger PaymentModal
  };

  const handlePaymentConfirm = async (payments: any[]) => {
    if (!payments.length && amountAfterGiftCards > 0) {
      setFormError("No payments were entered.");
      return;
    }

    try {
      const orderData = {
        customerId: customerState.customerId,
        orders: orderState.orders,
        paymentConfirmed: true,
        payments: payments.length > 0 ? payments : [{
          method: 'GIFT_CARD',
          amount: giftCardDiscount,
          details: {}
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

      if (giftCardNumbers.length > 0) {
        console.log('🎁 Activating gift cards...');
        const { activateGiftCard } = await import('../../../services/giftCardService');
        for (const { cardNumber, amount } of giftCardNumbers) {
          try {
            await activateGiftCard(cardNumber, amount);
            console.log('✅ Activated card:', cardNumber);
          } catch (error: any) {
            console.error('❌ Failed to activate card:', cardNumber);
          }
        }
      }

      if (pendingGiftCardRedemptions.length > 0) {
        console.log('💳 Redeeming gift cards...');
        const { redeemGiftCard } = await import('../../../services/giftCardService');
        for (const { cardNumber, amount } of pendingGiftCardRedemptions) {
          try {
            await redeemGiftCard(cardNumber, amount);
            console.log('✅ Redeemed card:', cardNumber, 'for $', amount);
          } catch (error: any) {
            console.error('❌ Failed to redeem card:', cardNumber);
          }
        }
      }

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

      setShowPaymentPopup(false);
      alert("✅ All orders created successfully!");
      setCouponCode("");
      setGiftCardNumbers([]);
      setPendingGiftCardRedemptions([]);
      setFormError(null);
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
      <GiftCardActivationModal
        open={showGiftCardActivation}
        onClose={() => setShowGiftCardActivation(false)}
        orderItems={currentOrder?.customProducts || []}
        onActivationComplete={handleGiftCardNumbersCollected}
      />
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