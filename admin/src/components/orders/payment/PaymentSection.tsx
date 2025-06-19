// src/components/orders/payment/PaymentSection.tsx
import React, { useState } from 'react';
import PaymentCard from '../PaymentCard';
import TakeOrderPaymentModal from './TakeOrderPaymentModal';
import GiftCardActivationModal from './GiftCardActivationModal';
import GiftCardHandoffModal from './GiftCardHandoffModal';
import { orderContainsGiftCards } from '../../../utils/giftCardHelpers';
import { useTaxRates } from '../../../hooks/useTaxRates';

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
  orderSource: "phone" | "walkin" | "pos";
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
}) => {
  const [couponCode, setCouponCode] = useState("");
  
  // Get centralized tax rates
  const { calculateTax } = useTaxRates();
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGiftCardActivation, setShowGiftCardActivation] = useState(false);
  const [showGiftCardHandoff, setShowGiftCardHandoff] = useState(false);
  const [giftCardNumbers, setGiftCardNumbers] = useState<any[]>([]);
  const [activatedGiftCards, setActivatedGiftCards] = useState<any[]>([]);
  const [pendingGiftCardRedemptions, setPendingGiftCardRedemptions] = useState<any[]>([]);
  const [isProcessingPOSTransfer, setIsProcessingPOSTransfer] = useState(false);

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

    // Check if this is a "Send to POS" payment
    const posTransferPayment = payments.find(p => p.method === 'send_to_pos');
    
    if (posTransferPayment) {
      // Prevent multiple submissions
      if (isProcessingPOSTransfer) {
        console.log('⏳ POS transfer already in progress...');
        return;
      }
      
      setIsProcessingPOSTransfer(true);
      
      // Handle Send to POS - save as draft and transfer directly
      console.log('📤 Saving as draft and transferring to POS...');
      
      try {
        // First, create/update recipients using customer API
        const ordersWithRecipientIds = await Promise.all(
          orderState.orders.map(async (order) => {
            if (order.orderType === 'DELIVERY') {
              // Use customer recipient API to create/update recipient
              const recipientResponse = await fetch(`/api/customers/${customerState.customerId}/recipients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                })
              });
              
              const recipient = await recipientResponse.json();
              return { ...order, recipientId: recipient.id };
            }
            return order;
          })
        );

        // Create DRAFT orders (data safety) using draft API
        const draftOrderData = {
          customerId: customerState.customerId,
          orders: ordersWithRecipientIds,
        };

        console.log('📦 Creating draft orders...', draftOrderData);
        const response = await fetch('/api/orders/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftOrderData)
        });

        const result = await response.json();
        if (!result.success) {
          console.error('❌ Draft creation failed:', result);
          setFormError(result.error || 'Failed to create draft orders');
          setIsProcessingPOSTransfer(false);
          return;
        }

        console.log('✅ Draft orders created successfully:', result.drafts);

        // Calculate individual order totals for POS
        const ordersWithIndividualTotals = result.drafts.map((draftOrder, index) => {
          const originalOrder = ordersWithRecipientIds[index];
          
          // Calculate this order's item total
          const orderItemTotal = originalOrder.customProducts.reduce((sum, product) => {
            return sum + (parseFloat(product.price) || 0) * (parseInt(product.qty) || 0);
          }, 0);
          
          // Each order gets its own delivery fee
          const orderDeliveryFee = originalOrder.deliveryFee || 0;
          
          // For now, distribute discounts proportionally (could be improved)
          const totalItemsValue = itemTotal;
          const orderDiscountRatio = totalItemsValue > 0 ? orderItemTotal / totalItemsValue : 0;
          const orderDiscount = (manualDiscount + couponDiscount + giftCardDiscount) * orderDiscountRatio;
          
          // Calculate order subtotal and taxes using centralized rates
          const orderSubtotal = orderItemTotal + orderDeliveryFee - orderDiscount;
          const orderTaxCalculation = calculateTax(orderSubtotal);
          const orderGrandTotal = orderSubtotal + orderTaxCalculation.totalAmount;
          
          return {
            ...draftOrder,
            individualTotal: orderGrandTotal,
            itemTotal: orderItemTotal,
            deliveryFee: orderDeliveryFee,
            discount: orderDiscount,
            taxBreakdown: orderTaxCalculation.breakdown,
            totalTax: orderTaxCalculation.totalAmount,
            subtotal: orderSubtotal
          };
        });

        // Create transfer data for POS using draft orders with individual totals
        const transferData = {
          type: 'pos_transfer',
          customer: customerState.customer,
          orders: ordersWithIndividualTotals, // Use orders with individual totals
          draftIds: result.drafts.map(d => d.id), // Store draft IDs for later
          totals: {
            itemTotal,
            deliveryFee: totalDeliveryFee,
            discount: manualDiscount + couponDiscount + giftCardDiscount,
            gst,
            pst,
            grandTotal
          },
          employee,
          orderSource: 'takeorder_to_pos'
        };

        // Use existing callback mechanism with transfer data!
        console.log('✅ Transferring to POS via callback...');
        setShowPaymentPopup(false);
        onOrderComplete(transferData); // Pass transfer data directly to TakeOrderPage
        return;

      } catch (error) {
        console.error("Error creating draft orders:", error);
        setFormError("Failed to create draft orders for POS transfer.");
        setIsProcessingPOSTransfer(false);
        return;
      }
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
            const employeeId = employee; // Should be employee ID, not name
            const transactionResponse = await fetch('/api/payment-transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: customerState.customerId,
                employeeId: employeeId,
                channel: 'PHONE',
                totalAmount: grandTotal,
                taxAmount: calculateTax(itemTotal + totalDeliveryFee - manualDiscount - couponDiscount - giftCardDiscount).totalAmount,
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
      if (giftCardNumbers.length > 0) {
        console.log('🎁 Creating/activating gift cards...');
        const { purchaseGiftCards } = await import('../../../services/giftCardService');
        
        try {
          // Convert gift card data to purchase format
          const cardsToProcess = giftCardNumbers.map(card => ({
            cardNumber: card.cardNumber, // Physical card number (only for physical cards)
            amount: card.amount,
            type: card.type || 'PHYSICAL', // Use the actual card type from activation modal
            recipientName: card.recipientName || customerState.customer?.firstName + ' ' + customerState.customer?.lastName,
            recipientEmail: card.recipientEmail // Include email for digital cards
          }));

          const purchaseResult = await purchaseGiftCards(
            cardsToProcess,
            customerState.customer?.id,
            employee,
            result.orders[0]?.id // Use first order ID for tracking
          );

          console.log('✅ Gift cards created/activated:', purchaseResult.cards);
          
          // Store activated cards and show handoff modal
          setActivatedGiftCards(purchaseResult.cards);
          setShowGiftCardHandoff(true);
          
        } catch (error: any) {
          console.error('❌ Failed to create/activate gift cards:', error);
          setFormError(`Orders created but gift card activation failed: ${error.message}`);
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
            // First, get existing recipients to check for duplicates
            const existingResponse = await fetch(`/api/customers/${customerState.customerId}/recipients`);
            const existingRecipients = existingResponse.ok ? await existingResponse.json() : [];
            
            // Check if recipient already exists (match by name and address)
            const existingRecipient = existingRecipients.find((r: any) => 
              r.firstName?.toLowerCase() === order.recipientFirstName?.toLowerCase() &&
              r.lastName?.toLowerCase() === order.recipientLastName?.toLowerCase() &&
              r.address1?.toLowerCase() === order.recipientAddress.address1?.toLowerCase() &&
              r.city?.toLowerCase() === order.recipientAddress.city?.toLowerCase()
            );
            
            const recipientData = {
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
            };
            
            if (existingRecipient) {
              // Update existing recipient
              await fetch(`/api/customers/${customerState.customerId}/recipients/${existingRecipient.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(recipientData),
              });
              console.log("✅ Updated existing recipient:", existingRecipient.id);
            } else {
              // Create new recipient
              await fetch(`/api/customers/${customerState.customerId}/recipients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(recipientData),
              });
              console.log("✅ Created new recipient");
            }
          } catch (error) {
            console.error("Failed to auto-save recipient:", error);
          }
        }
      }

      // 📧 Send receipt email if requested
      if (sendEmailReceipt && customerState.customer?.email && orderData.transactionNumber) {
        console.log('📧 Sending receipt email...');
        try {
          const receiptResponse = await fetch('/api/email/receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerEmail: customerState.customer.email,
              customerName: customerState.customer.firstName + ' ' + customerState.customer.lastName,
              transactionNumber: orderData.transactionNumber,
              orderNumbers: result.orders.map((order: any) => order.id),
              totalAmount: grandTotal,
              paymentMethods: payments.map(p => ({
                type: p.method,
                amount: p.amount
              })),
              orderDetails: result.orders
            })
          });

          if (receiptResponse.ok) {
            console.log('✅ Receipt email sent successfully');
          } else {
            console.log('❌ Failed to send receipt email');
          }
        } catch (error) {
          console.error('❌ Error sending receipt email:', error);
          // Don't fail the order if email fails
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
      <TakeOrderPaymentModal
        open={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        total={grandTotal}
        giftCardDiscount={giftCardDiscount}
        employee={employee}
        setFormError={setFormError}
        onConfirm={handlePaymentConfirm}
        isOverlay={isOverlay}
      />
      <GiftCardHandoffModal
        open={showGiftCardHandoff}
        onClose={() => {
          setShowGiftCardHandoff(false);
          setActivatedGiftCards([]);
          onOrderComplete(); // Complete the order flow after gift card handoff
        }}
        cards={activatedGiftCards}
        customerName={customerState.customer?.firstName + ' ' + customerState.customer?.lastName}
        isDigital={(() => {
          const hasDigital = activatedGiftCards.some(card => card.type === 'DIGITAL');
          console.log('🎁 TakeOrder HandoffModal Debug:', {
            activatedGiftCards,
            hasDigital,
            cardTypes: activatedGiftCards.map(card => card.type)
          });
          return hasDigital;
        })()}
      />
    </>
  );
};

// Helper function to map TakeOrder payment methods to PT transaction API format
const mapTakeOrderPaymentToAPI = (payment: any) => {
  const baseMethod = {
    type: mapPaymentMethodType(payment.method),
    provider: getPaymentProvider(payment.method),
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
        checkNumber: payment.metadata?.checkNumber
      };
    case 'cod':
    case 'cash':
    case 'wire':
    case 'house_account':
      return baseMethod;
    default:
      return baseMethod;
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
    'wire': 'CHECK', // Wire transfers treated as checks for now
    'house_account': 'STORE_CREDIT' // House account treated as store credit
  };
  
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