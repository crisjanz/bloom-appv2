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

  // Gift card state - store card numbers for activation AFTER order save
  const [showGiftCardActivation, setShowGiftCardActivation] = useState(false);
  const [giftCardNumbers, setGiftCardNumbers] = useState<any[]>([]);

  // Check if current order has gift cards
  const currentOrder = orderState.orders[orderState.activeTab];
  const hasGiftCards = currentOrder ? orderContainsGiftCards(currentOrder.customProducts) : false;

  // Handle payment trigger - get gift card numbers first if needed
  const handleTriggerPayment = () => {
    if (hasGiftCards && giftCardNumbers.length === 0) {
      // Show gift card activation modal to GET CARD NUMBERS (not activate yet)
      setShowGiftCardActivation(true);
    } else {
      // Proceed to normal payment
      setShowPaymentPopup(true);
    }
  };

  // Handle gift card numbers collection and price override
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
        // Generate the same stable ID that was used in the original summary
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
    
    // Proceed to payment
    setShowPaymentPopup(true);
  };

  const handlePaymentConfirm = async (payments: any[]) => {
    if (!payments.length) {
      setFormError("No payments were entered.");
      return;
    }

    const groupId = generateId();

    try {
      // STEP 1: Save orders FIRST (before activating gift cards)
      for (const order of orderState.orders) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: customerState.customer,
            recipient: {
              firstName: order.recipientFirstName,
              lastName: order.recipientLastName,
              company: order.recipientCompany,
              phone: cleanPhoneNumber(order.recipientPhone),
              address: order.recipientAddress,
            },
            orderType: order.orderType,
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTime,
            deliveryInstructions: order.deliveryInstructions,
            cardMessage: order.cardMessage,
            products: order.customProducts,
            payments,
            paymentMethod: payments.map((p) => p.method).join(" + "),
            status: payments.some((p) =>
              ["Pay in POS", "COD", "House Account", "Wire"].includes(p.method)
            )
              ? "unpaid"
              : "paid",
            groupId,
            employeeId: employee,
            orderSource: orderSource,
            deliveryCharge: order.deliveryFee,
          }),
        });

        if (!res.ok) {
          console.error("❌ Failed to save order");
          setFormError("Failed to save order. Try again.");
          return; // Exit here - gift cards NOT activated if order fails
        }

        // Auto-save recipient
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

      // STEP 2: Only activate gift cards AFTER successful order saving
      let activatedGiftCards: any[] = [];
      
      if (giftCardNumbers.length > 0) {
        console.log('🎁 Activating gift cards after successful order save...');
        
        const { activateGiftCard } = await import('../../../services/giftCardService');
        
        for (const cardData of giftCardNumbers) {
          try {
            const result = await activateGiftCard(cardData.cardNumber, cardData.amount);
            activatedGiftCards.push({
              cardNumber: cardData.cardNumber,
              amount: cardData.amount,
              result
            });
            console.log('✅ Activated card:', cardData.cardNumber);
          } catch (error: any) {
            console.error('❌ Failed to activate card:', cardData.cardNumber, error);
            // At this point, order is already saved, so just log the error
            // Could implement rollback logic here if needed
          }
        }
        
        console.log('🎉 Gift card activation complete!');
      }

      // Success! Reset everything
      setShowPaymentPopup(false);
      alert("✅ All orders saved successfully.");
      
      // Reset all state
      setCouponCode("");
      setGiftCardNumbers([]);
      
      // Call parent reset
      onOrderComplete();
      
    } catch (error) {
      console.error("Error saving orders:", error);
      setFormError("An error occurred while saving orders.");
      // Gift cards are NOT activated if we reach this error
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
        onGiftCardChange={setGiftCardDiscount}
        customerId={customerState.customerId}
        source="WEBSITE"
        hasGiftCards={hasGiftCards}
      />

      {/* Gift Card Numbers Collection Modal */}
      <GiftCardActivationModal
        open={showGiftCardActivation}
        onClose={() => setShowGiftCardActivation(false)}
        orderItems={currentOrder?.customProducts || []}
        onActivationComplete={handleGiftCardNumbersCollected}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        total={grandTotal}
        employee={employee}
        setFormError={setFormError}
        onConfirm={handlePaymentConfirm}
      />
    </>
  );
};

export default PaymentSection;